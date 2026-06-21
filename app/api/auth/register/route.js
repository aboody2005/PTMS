import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, role, phone, gender, locationId } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database environment variables (SUPABASE_SERVICE_ROLE_KEY) are missing on the server.' },
        { status: 500 }
      );
    }

    // Initialize the Admin client using the Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create the user with email_confirm: true to auto-verify and bypass SMTP limits
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: role || 'student',
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;
    const targetRole = role || 'student';

    // Update phone & gender on the profile table (managed by trigger/RLS normally)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone: phone || '',
        gender: gender || '',
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // If student and locationId is specified, update location_id on student table
    if (targetRole === 'student' && locationId) {
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .update({
          location_id: locationId,
        })
        .eq('user_id', userId);

      if (studentError) {
        console.error('Student location update error:', studentError);
      }
    }

    return NextResponse.json({ user: authData.user }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
