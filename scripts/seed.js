/**
 * Seed script - Populates Supabase with demo data
 * Run: node scripts/seed.js
 */

const { loadEnvConfig } = require('@next/env');
// Load Next.js environment variables from .env.local
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ─── Seed Data ───────────────────────────────────────────────────────────────
const locations = [
  { name: 'Al-Nour Pharmacy', city: 'Mosul', region: 'Nineveh' },
  { name: 'Al-Salam Pharmacy', city: 'Mosul', region: 'Nineveh' },
  { name: 'Al-Hayat Pharmacy', city: 'Baghdad', region: 'Baghdad' },
  { name: 'Al-Razi Pharmacy', city: 'Baghdad', region: 'Baghdad' },
  { name: 'Al-Amal Pharmacy', city: 'Erbil', region: 'Kurdistan' },
  { name: 'Noor Al-Shifaa', city: 'Basra', region: 'Basra' },
  { name: 'Al-Hikma Pharmacy', city: 'Kirkuk', region: 'Kirkuk' },
  { name: 'Al-Shifa Pharmacy', city: 'Najaf', region: 'Najaf' },
  { name: 'Al-Karima Pharmacy', city: 'Karbala', region: 'Karbala' },
  { name: 'Al-Manar Pharmacy', city: 'Sulaymaniyah', region: 'Kurdistan' },
];

const adminData = {
  name: 'System Admin', email: 'admin@ptms.com', role: 'admin',
  phone: '+964-770-0000001', gender: 'male',
};

const teachersData = [
  { name: 'Dr. Ahmed Hassan', email: 'teacher1@ptms.com', phone: '+964-770-1111111', gender: 'male', department: 'Clinical Pharmacy', specialty: 'Pharmacotherapy' },
  { name: 'Dr. Sarah Khalil', email: 'teacher2@ptms.com', phone: '+964-770-2222222', gender: 'female', department: 'Pharmaceutical Sciences', specialty: 'Pharmacology' },
  { name: 'Dr. Omar Rashid', email: 'teacher3@ptms.com', phone: '+964-770-3333333', gender: 'male', department: 'Community Pharmacy', specialty: 'Drug Dispensing' },
];

const studentsData = [
  { name: 'Ali Mohammed', email: 'student1@ptms.com', phone: '+964-770-4444441', gender: 'male', university: 'جامعة الحدباء', status: 'active' },
  { name: 'Fatima Younis', email: 'student2@ptms.com', phone: '+964-770-4444442', gender: 'female', university: 'جامعة الحدباء', status: 'active' },
  { name: 'Zaid Ibrahim', email: 'student3@ptms.com', phone: '+964-770-4444443', gender: 'male', university: 'جامعة الحدباء', status: 'active' },
  { name: 'Noor Al-Saadi', email: 'student4@ptms.com', phone: '+964-770-4444444', gender: 'female', university: 'جامعة الحدباء', status: 'completed' },
  { name: 'Hassan Ali', email: 'student5@ptms.com', phone: '+964-770-4444445', gender: 'male', university: 'جامعة الحدباء', status: 'active' },
  { name: 'Maryam Saleh', email: 'student6@ptms.com', phone: '+964-770-4444446', gender: 'female', university: 'جامعة الحدباء', status: 'active' },
  { name: 'Kareem Naji', email: 'student7@ptms.com', phone: '+964-770-4444447', gender: 'male', university: 'جامعة الحدباء', status: 'active' },
  { name: 'Rania Hamed', email: 'student8@ptms.com', phone: '+964-770-4444448', gender: 'female', university: 'جامعة الحدباء', status: 'active' },
  { name: 'Tariq Mahmoud', email: 'student9@ptms.com', phone: '+964-770-4444449', gender: 'male', university: 'جامعة الحدباء', status: 'completed' },
  { name: 'Dina Karim', email: 'student10@ptms.com', phone: '+964-770-4444450', gender: 'female', university: 'جامعة الحدباء', status: 'active' },
];

// GPS coordinates for Iraqi cities
const cityCoords = {
  'Mosul': { lat: 36.3350, lng: 43.1189 },
  'Baghdad': { lat: 33.3152, lng: 44.3661 },
  'Erbil': { lat: 36.1912, lng: 44.0092 },
  'Basra': { lat: 30.5085, lng: 47.7804 },
  'Kirkuk': { lat: 35.4681, lng: 44.3922 },
  'Najaf': { lat: 31.9938, lng: 44.3419 },
  'Karbala': { lat: 32.6165, lng: 44.0243 },
  'Sulaymaniyah': { lat: 35.5570, lng: 45.4350 },
};

async function seed() {
  console.log('🌱 Connecting to Supabase...');
  
  // 1. Delete all existing auth users (cascades automatically to profiles, students, teachers, visits, notifications)
  console.log('🗑️  Clearing existing users...');
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 50,
    });
    if (listError) {
      console.error('Error listing users:', listError);
      break;
    }
    if (!users || users.length === 0) {
      hasMore = false;
      break;
    }
    console.log(`Deleting ${users.length} users...`);
    for (const u of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`Failed to delete auth user ${u.id}:`, delErr.message);
      }
    }
    page++;
  }

  // 2. Clear remaining tables (like locations and settings)
  console.log('🗑️  Clearing locations and settings...');
  await supabase.from('locations').delete().gt('created_at', '1970-01-01');
  await supabase.from('settings').delete().gt('created_at', '1970-01-01');

  // 3. Create settings
  console.log('⚙️  Creating default settings...');
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 6);
  await supabase.from('settings').insert({
    key: 'defaultTrainingEndDate',
    value: defaultEndDate.toISOString(),
  });

  // 4. Create locations
  console.log('📍 Seeding locations...');
  const { data: createdLocations, error: locErr } = await supabase
    .from('locations')
    .insert(locations)
    .select();

  if (locErr || !createdLocations) {
    throw new Error('Failed to seed locations: ' + (locErr?.message || 'unknown error'));
  }
  console.log(`📍 Created ${createdLocations.length} locations`);

  // 5. Create admin
  console.log('👤 Seeding admin...');
  const { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
    email: adminData.email,
    password: 'Admin@123',
    email_confirm: true,
    user_metadata: {
      name: adminData.name,
      role: 'admin',
    },
  });

  if (adminErr || !adminUser?.user) {
    throw new Error('Failed to create admin: ' + (adminErr?.message || 'unknown error'));
  }

  await supabase
    .from('profiles')
    .update({
      phone: adminData.phone,
      gender: adminData.gender,
    })
    .eq('id', adminUser.user.id);
  console.log('👤 Created admin:', adminUser.user.email);

  // 6. Create teachers
  console.log('👨‍🏫 Seeding teachers...');
  const createdTeachers = [];
  for (const t of teachersData) {
    const { data: teacherUser, error: tErr } = await supabase.auth.admin.createUser({
      email: t.email,
      password: 'Teacher@123',
      email_confirm: true,
      user_metadata: {
        name: t.name,
        role: 'teacher',
      },
    });

    if (tErr || !teacherUser?.user) {
      console.error(`Failed to create teacher ${t.email}:`, tErr?.message);
      continue;
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({
        phone: t.phone,
        gender: t.gender,
      })
      .eq('id', teacherUser.user.id);

    // Update teacher fields
    await supabase
      .from('teachers')
      .update({
        department: t.department,
        specialty: t.specialty,
      })
      .eq('user_id', teacherUser.user.id);

    createdTeachers.push(teacherUser.user);
    console.log('👨‍🏫 Created teacher:', teacherUser.user.email);
  }

  // 7. Create students
  console.log('🎓 Seeding students...');
  const createdStudents = [];
  for (let i = 0; i < studentsData.length; i++) {
    const s = studentsData[i];
    const { data: studentUser, error: sErr } = await supabase.auth.admin.createUser({
      email: s.email,
      password: 'Student@123',
      email_confirm: true,
      user_metadata: {
        name: s.name,
        role: 'student',
      },
    });

    if (sErr || !studentUser?.user) {
      console.error(`Failed to create student ${s.email}:`, sErr?.message);
      continue;
    }

    // Assign location and teacher
    const location = createdLocations[i % createdLocations.length];
    const teacher = createdTeachers[i % createdTeachers.length];
    const cityCoord = cityCoords[location.city] || { lat: 33.3152, lng: 44.3661 };

    const startDate = new Date(2024, Math.floor(i / 3), 1 + (i * 2));
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);

    // Update profile phone & gender
    await supabase
      .from('profiles')
      .update({
        phone: s.phone,
        gender: s.gender,
      })
      .eq('id', studentUser.user.id);

    // Update student fields
    const { data: studentRow, error: studentUpdateErr } = await supabase
      .from('students')
      .update({
        university: s.university,
        pharmacy_name: location.name,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location_id: location.id,
        latitude: cityCoord.lat + (Math.random() - 0.5) * 0.05,
        longitude: cityCoord.lng + (Math.random() - 0.5) * 0.05,
        teacher_id: teacher.id,
        status: s.status,
      })
      .eq('user_id', studentUser.user.id)
      .select()
      .single();

    if (studentUpdateErr) {
      console.error(`Failed to update student row for ${s.email}:`, studentUpdateErr.message);
    }

    createdStudents.push({ user: studentUser.user, student: studentRow });
    console.log('🎓 Created student:', studentUser.user.email);
  }

  // 8. Create visit records
  console.log('📋 Seeding visits...');
  const visitNotes = [
    'Student is performing well. Pharmacy environment is suitable.',
    'Training is progressing as expected.',
    'Student demonstrates good knowledge of drug dispensing.',
    'Excellent performance, student is engaged and learning.',
    'Visit confirmed. Student needs more practice on documentation.',
  ];

  let visitCount = 0;
  for (const { user: sUser, student } of createdStudents) {
    if (!student) continue;
    const numVisits = Math.floor(Math.random() * 4) + 1;
    const teacher = createdTeachers[Math.floor(Math.random() * createdTeachers.length)];

    for (let v = 0; v < numVisits; v++) {
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 90));

      const { error: visitErr } = await supabase
        .from('visits')
        .insert({
          student_id: student.id,
          teacher_id: teacher.id,
          teacher_name: teacher.user_metadata?.name || '',
          student_name: sUser.user_metadata?.name || '',
          visited_at: visitDate.toISOString(),
          notes: visitNotes[Math.floor(Math.random() * visitNotes.length)],
        });

      if (visitErr) {
        console.error(`Failed to create visit for student ${student.id}:`, visitErr.message);
      } else {
        visitCount++;
      }
    }

    // Create notifications
    await supabase.from('notifications').insert([
      {
        user_id: sUser.id,
        message: 'Welcome to the Pharmacy Training Management System! Complete your profile to get started.',
        type: 'info',
      },
      {
        user_id: sUser.id,
        message: 'A supervisor teacher has been assigned to your training profile.',
        type: 'success',
      }
    ]);
  }

  console.log(`📋 Created ${visitCount} visit records`);
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Demo Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin    | admin@ptms.com      | Admin@123');
  console.log('Teacher  | teacher1@ptms.com   | Teacher@123');
  console.log('Teacher  | teacher2@ptms.com   | Teacher@123');
  console.log('Student  | student1@ptms.com   | Student@123');
  console.log('Student  | student2@ptms.com   | Student@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
