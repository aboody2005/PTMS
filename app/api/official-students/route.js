import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET — list all official students
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('official_students')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ students: data || [] });
  } catch (err) {
    console.error('[official-students GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — add a single student
export async function POST(req) {
  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if this name already exists in profiles (registered users)
    const normalizedName = name.trim().toLowerCase();
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .ilike('name', name.trim())
      .maybeSingle();

    const isRegistered = !!profileMatch;

    const { data, error } = await supabase
      .from('official_students')
      .insert({
        name: name.trim(),
        is_registered: isRegistered,
        registered_at: isRegistered ? profileMatch.created_at : null,
        linked_user_id: isRegistered ? profileMatch.id : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ student: data }, { status: 201 });
  } catch (err) {
    console.error('[official-students POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
