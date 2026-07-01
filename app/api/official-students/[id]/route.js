import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// PATCH — edit a student's name
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Re-check registration status for the new name
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .ilike('name', name.trim())
      .maybeSingle();

    const isRegistered = !!profileMatch;

    const { data, error } = await supabase
      .from('official_students')
      .update({
        name: name.trim(),
        is_registered: isRegistered,
        registered_at: isRegistered ? profileMatch.created_at : null,
        linked_user_id: isRegistered ? profileMatch.id : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ student: data });
  } catch (err) {
    console.error('[official-students PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a student
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('official_students')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[official-students DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
