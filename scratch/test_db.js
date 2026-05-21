const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching users from auth...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing auth users:', listError);
    return;
  }
  console.log(`Found ${users.length} auth users`);
  for (const u of users) {
    console.log(`Auth user: ${u.email} (ID: ${u.id}) metadata role: ${u.user_metadata?.role}`);
  }

  console.log('\nFetching profiles from database...');
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
  if (profError) {
    console.error('Error listing profiles:', profError);
    return;
  }
  console.log(`Found ${profiles.length} profiles`);
  for (const p of profiles) {
    console.log(`Profile: ${p.email} (ID: ${p.id}) role: ${p.role} is_active: ${p.is_active}`);
  }

  console.log('\nFetching students from database...');
  const { data: students, error: studError } = await supabase.from('students').select('*');
  if (studError) {
    console.error('Error listing students:', studError);
    return;
  }
  console.log(`Found ${students.length} students`);
  for (const s of students) {
    console.log(`Student: user_id: ${s.user_id} location_id: ${s.location_id}`);
  }
}

run().catch(console.error);
