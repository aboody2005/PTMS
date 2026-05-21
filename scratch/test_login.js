const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const credentials = [
    { email: 'admin@ptms.com', password: 'Admin@123', label: 'Admin' },
    { email: 'teacher1@ptms.com', password: 'Teacher@123', label: 'Teacher 1' },
    { email: 'student1@ptms.com', password: 'Student@123', label: 'Student 1' },
  ];

  for (const cred of credentials) {
    console.log(`Trying login for ${cred.label} (${cred.email})...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cred.email,
      password: cred.password,
    });
    if (error) {
      console.error(`❌ Failed: ${error.message}`);
    } else {
      console.log(`✅ Success! User ID: ${data.user.id}`);
    }
  }
}

run().catch(console.error);
