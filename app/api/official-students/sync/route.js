import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * POST /api/official-students/sync
 * Called after every successful registration.
 * Body: { name: string, userId: string }
 *
 * - If name matches an official_student (case-insensitive, trimmed):
 *     → mark is_registered=true, set registered_at + linked_user_id
 * - If no match:
 *     → find the first admin and create a notification for them
 */
export async function POST(req) {
  try {
    const { name, userId } = await req.json();
    if (!name || !userId) {
      return NextResponse.json({ error: 'name and userId are required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const normalizedName = name.trim().toLowerCase();

    // Fetch all official students for comparison
    const { data: officials } = await supabase
      .from('official_students')
      .select('id, name');

    const match = (officials || []).find(
      (s) => s.name.trim().toLowerCase() === normalizedName
    );

    if (match) {
      // Mark as registered
      await supabase
        .from('official_students')
        .update({
          is_registered: true,
          registered_at: new Date().toISOString(),
          linked_user_id: userId,
        })
        .eq('id', match.id);

      return NextResponse.json({ matched: true, officialStudentId: match.id });
    } else {
      // Not in official list — notify all admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          message: `تسجيل جديد: "${name.trim()}" ليس موجوداً في قائمة الطلبة الرسمية. يرجى مراجعة قائمة بيانات الطلبة.`,
          type: 'warning',
          link: '/admin/visits/student-data',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      return NextResponse.json({ matched: false });
    }
  } catch (err) {
    console.error('[official-students sync]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/official-students/sync
 * Bulk re-sync: cross-references ALL official_students against profiles
 * to repair stale is_registered flags (e.g. from historical data before the fix).
 */
export async function GET() {
  try {
    const supabase = getAdminClient();

    // Load all official students and all student profiles in parallel
    const [{ data: officials }, { data: profiles }] = await Promise.all([
      supabase.from('official_students').select('id, name, is_registered, linked_user_id'),
      supabase.from('profiles').select('id, name, created_at').eq('role', 'student'),
    ]);

    if (!officials || !profiles) {
      return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
    }

    let updated = 0;
    let cleared = 0;

    for (const official of officials) {
      const normalizedOfficial = official.name.trim().toLowerCase();
      const matchingProfile = profiles.find(
        (p) => p.name.trim().toLowerCase() === normalizedOfficial
      );

      if (matchingProfile && !official.is_registered) {
        // Should be registered but isn't — fix it
        await supabase
          .from('official_students')
          .update({
            is_registered: true,
            registered_at: matchingProfile.created_at,
            linked_user_id: matchingProfile.id,
          })
          .eq('id', official.id);
        updated++;
      } else if (!matchingProfile && official.is_registered) {
        // Marked as registered but the profile is gone — clear it
        await supabase
          .from('official_students')
          .update({
            is_registered: false,
            registered_at: null,
            linked_user_id: null,
          })
          .eq('id', official.id);
        cleared++;
      }
    }

    return NextResponse.json({ success: true, updated, cleared });
  } catch (err) {
    console.error('[official-students bulk sync]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
