import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST — bulk import names from parsed CSV/Excel
// Body: { names: string[] }
export async function POST(req) {
  try {
    const { names } = await req.json();
    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: 'names array is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Fetch all registered profiles for batch name matching
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .eq('role', 'student');

    const profileMap = new Map(
      (profiles || []).map((p) => [p.name.trim().toLowerCase(), p])
    );

    // Fetch existing names to avoid duplicates
    const { data: existing } = await supabase
      .from('official_students')
      .select('name');
    const existingNames = new Set(
      (existing || []).map((s) => s.name.trim().toLowerCase())
    );

    const toInsert = [];
    const skipped = [];

    for (const rawName of names) {
      const trimmed = rawName.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();

      if (existingNames.has(lower)) {
        skipped.push(trimmed);
        continue;
      }

      const profileMatch = profileMap.get(lower);
      toInsert.push({
        name: trimmed,
        is_registered: !!profileMatch,
        registered_at: profileMatch ? profileMatch.created_at : null,
        linked_user_id: profileMatch ? profileMatch.id : null,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      const { error } = await supabase.from('official_students').insert(toInsert);
      if (error) throw error;
      inserted = toInsert.length;
    }

    return NextResponse.json({ inserted, skipped: skipped.length, skippedNames: skipped });
  } catch (err) {
    console.error('[official-students import]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
