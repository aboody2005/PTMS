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

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Authenticate the requester via the Authorization header token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Create client using user's own token to verify authenticity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if the requester is an active administrator in the database
    const supabaseAdmin = getAdminClient();
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || !requesterProfile || requesterProfile.role !== 'admin' || !requesterProfile.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Explicitly delete user data in the correct dependency order.
    // This ensures that all old data is thoroughly cleaned up, even if the database
    // foreign key cascades are not properly configured on the Supabase instance.
    try {
      // 3.1. Find student record
      const { data: studentRecord } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('user_id', id)
        .maybeSingle();

      if (studentRecord) {
        // 3.2. Delete visits associated with the student
        await supabaseAdmin
          .from('visits')
          .delete()
          .eq('student_id', studentRecord.id);

        // 3.3. Delete the student record
        await supabaseAdmin
          .from('students')
          .delete()
          .eq('id', studentRecord.id);
      }

      // 3.4. If teacher, delete teacher record and associated visits
      await supabaseAdmin.from('teachers').delete().eq('user_id', id);
      await supabaseAdmin.from('visits').delete().eq('teacher_id', id);

      // 3.5. Delete user notifications
      await supabaseAdmin.from('notifications').delete().eq('user_id', id);

      // 3.6. Reset registration status in official_students
      await supabaseAdmin
        .from('official_students')
        .update({
          is_registered: false,
          registered_at: null,
          linked_user_id: null,
        })
        .eq('linked_user_id', id);

      // 3.7. Delete database profile
      await supabaseAdmin.from('profiles').delete().eq('id', id);

    } catch (dbError) {
      // Proceed to delete the auth user to prevent orphaned states.
    }

    // 4. Delete the user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
