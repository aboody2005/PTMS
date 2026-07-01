import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public endpoint — no admin auth needed, students use this during registration
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/official-students/search?q=أحمد
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('official_students')
      .select('id, name, is_registered')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(8);

    if (error) throw error;
    return NextResponse.json({ suggestions: data || [] });
  } catch (err) {
    console.error('[official-students search]', err);
    return NextResponse.json({ suggestions: [] });
  }
}
