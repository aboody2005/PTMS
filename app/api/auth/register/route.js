import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY on server');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, role, phone, gender, locationId } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Phone is required and must be 07XXXXXXXXX (11 digits)
    if (!phone || !/^07\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'رقم الهاتف مطلوب ويجب أن يبدأ بـ 07 ويتكون من 11 رقماً' },
        { status: 400 }
      );
    }

    // Email must be a university email
    if (!email.toLowerCase().endsWith('@hu.edu.iq')) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني يجب أن ينتهي بـ @hu.edu.iq' },
        { status: 400 }
      );
    }

    // Email must contain only ASCII (English) characters
    if (/[^\x00-\x7F]/.test(email)) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني يجب أن يحتوي على أحرف إنجليزية فقط' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();
    const targetRole = role || 'student';

    // 1. Validate name against official_students (students only)
    if (targetRole === 'student') {
      const { data: officials } = await supabaseAdmin
        .from('official_students')
        .select('id, name, is_registered');

      const normalizedInput = name.trim().toLowerCase();
      const match = (officials || []).find(
        (s) => s.name.trim().toLowerCase() === normalizedInput
      );

      if (!match) {
        return NextResponse.json(
          { error: 'اسمك غير موجود في قائمة الطلبة الرسمية. تواصل مع إدارة الجامعة.' },
          { status: 400 }
        );
      }

      if (match.is_registered) {
        return NextResponse.json(
          { error: 'هذا الاسم مسجّل مسبقاً. إذا كان الحساب لك فتواصل مع الإدارة.' },
          { status: 400 }
        );
      }
    }

    // 2. Create the auth user (email_confirm: true bypasses SMTP verification)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: targetRole },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Upsert profile — the trigger creates it, but may not have run yet.
    //    UPSERT ensures the row exists and the extra fields are set either way.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          name,
          role: targetRole,
          phone: phone || '',
          gender: gender || '',
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      // Don't fail the whole registration — the trigger may still fix it
    }

    // 3. If student, set locationId on the students row.
    //    The trigger creates the students row, so retry up to 3 times with a short delay.
    if (targetRole === 'student' && locationId) {
      let studentUpdated = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          // Wait 300ms before retrying (trigger may not have run yet)
          await new Promise((r) => setTimeout(r, 300));
        }

        const { error: studentError } = await supabaseAdmin
          .from('students')
          .update({ location_id: locationId })
          .eq('user_id', userId);

        if (!studentError) {
          studentUpdated = true;
          break;
        }

        console.warn(`Student location update attempt ${attempt + 1} failed:`, studentError.message);
      }

      if (!studentUpdated) {
        // Last resort: insert the student row directly
        const { error: insertError } = await supabaseAdmin
          .from('students')
          .insert({ user_id: userId, location_id: locationId });

        if (insertError) {
          console.error('Student insert fallback error:', insertError);
        }
      }
    }
    // 4. Sync official_students — mark the matching row as registered directly
    //    (done in-process to avoid the fragile fire-and-forget HTTP self-call)
    try {
      const normalizedName = name.trim().toLowerCase();
      const { data: officials } = await supabaseAdmin
        .from('official_students')
        .select('id, name');

      const match = (officials || []).find(
        (s) => s.name.trim().toLowerCase() === normalizedName
      );

      if (match) {
        await supabaseAdmin
          .from('official_students')
          .update({
            is_registered: true,
            registered_at: new Date().toISOString(),
            linked_user_id: userId,
          })
          .eq('id', match.id);
      }
    } catch (syncErr) {
      // Non-fatal — log but don't block the response
      console.error('Official student sync error:', syncErr);
    }

    return NextResponse.json(
      { user: { id: userId, email, name, role: targetRole } },
      { status: 200 }
    );
  } catch (err) {
    console.error('Register route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
