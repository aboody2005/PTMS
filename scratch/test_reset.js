const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's find student1@ptms.com
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const student = users.find(u => u.email === 'student1@ptms.com');
  if (!student) {
    console.error('student1@ptms.com not found');
    return;
  }
  
  console.log(`Found student1: ID is ${student.id}`);
  
  // Try to update password
  console.log('Updating password to "NewStudent@123"...');
  const { error: updateError } = await supabase.auth.admin.updateUserById(student.id, {
    password: 'NewStudent@123',
  });
  
  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return;
  }
  console.log('✅ Password updated successfully!');
  
  // Try logging in with the new password
  console.log('Verifying login with new password...');
  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'student1@ptms.com',
    password: 'NewStudent@123',
  });
  
  if (loginError) {
    console.error('❌ Login failed with new password:', loginError.message);
  } else {
    console.log('✅ Login successful with new password! User ID:', data.user.id);
  }

  // Restore the original password for consistency
  console.log('Restoring original password "Student@123"...');
  await supabase.auth.admin.updateUserById(student.id, {
    password: 'Student@123',
  });
}

run().catch(console.error);
