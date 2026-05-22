import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeStudent } from '@/lib/serializers';
import { cleanupDatabase } from '@/lib/dbCleanup';

// GET /api/students
export async function GET(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await cleanupDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');

    // 1. Build Query
    let query = supabase
      .from('students')
      .select(`
        *,
        profiles!user_id(*),
        locations(*),
        teacher:profiles!teacher_id(*)
      `);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (decoded.role === 'teacher') {
      query = query.eq('teacher_id', decoded.userId);
    }

    const { data: rawStudents, error } = await query;
    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json({ message: 'Error fetching students' }, { status: 500 });
    }

    // 2. Fetch all visits to join in memory
    const { data: rawVisits, error: visitsError } = await supabase
      .from('visits')
      .select('*');

    if (visitsError) {
      console.error('Error fetching visits:', visitsError);
    }
    const visits = rawVisits || [];

    // Helper: check if teacher is inactive (soft-deleted) and clear it
    const cleanStudentTeacher = (student) => {
      const teacherProfile = Array.isArray(student.teacher) ? student.teacher[0] : student.teacher;
      if (teacherProfile && teacherProfile.is_active === false) {
        student.teacher = null;
        student.teacher_id = null;
      }
      return student;
    };

    // 3. Process, Filter & Sort in-memory to match previous MongoDB filter-after-populate logic
    let processed = (rawStudents || [])
      .filter(s => {
        const userProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return userProfile !== null && userProfile !== undefined; // exclude orphaned records
      })
      .map(cleanStudentTeacher);

    if (search) {
      processed = processed.filter(s => {
        const userProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        const matchesName = userProfile.name?.toLowerCase().includes(search.toLowerCase());
        const matchesEmail = decoded.role !== 'teacher' && userProfile.email?.toLowerCase().includes(search.toLowerCase());
        return matchesName || matchesEmail;
      });
    }

    // Sort by name
    processed.sort((a, b) => {
      const aProfile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
      const bProfile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
      return (aProfile?.name || '').localeCompare(bProfile?.name || '');
    });

    const total = processed.length;
    const paginated = processed.slice((page - 1) * limit, page * limit);

    // 4. Enrich with visit info and serialize
    const students = paginated.map(s => {
      const userProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      const locationData = Array.isArray(s.locations) ? s.locations[0] : s.locations;
      const teacherProfile = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher;

      const serialized = serializeStudent(s, userProfile, locationData, teacherProfile);
      
      // Hide email for teacher role
      if (decoded.role === 'teacher' && serialized.userId) {
        delete serialized.userId.email;
      }

      // Check visit
      const visit = visits.find(v => v.student_id === s.id);
      return {
        ...serialized,
        isVisited: !!visit,
        visitDate: visit ? visit.visited_at : null
      };
    });

    return NextResponse.json({ 
      students, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error) {
    console.error('GET students error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/students - Set global training end date (applies to all existing + all future students)
export async function PUT(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { endDate } = await request.json();

    if (endDate === undefined) {
      return NextResponse.json({ message: 'endDate is required' }, { status: 400 });
    }

    // 1. Save as global setting so new students automatically get this date
    const { error: settingError } = await supabase
      .from('settings')
      .upsert({ key: 'defaultTrainingEndDate', value: endDate || '' }, { onConflict: 'key' });

    if (settingError) {
      console.error('Error saving global setting:', settingError);
      return NextResponse.json({ message: 'Error saving global setting: ' + settingError.message }, { status: 500 });
    }

    // 2. Update all existing students
    const { data, error: updateError, count } = await supabase
      .from('students')
      .update({ end_date: endDate || null })
      .in('status', ['active', 'completed']);

    if (updateError) {
      console.error('Error updating students:', updateError);
      return NextResponse.json({ message: 'Error updating students: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Global end date saved.`,
      modifiedCount: count || 0,
      defaultTrainingEndDate: endDate || null,
    });
  } catch (error) {
    console.error('PUT students global end date error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

// GET the global training end date setting (used for display in admin panel)
export async function PATCH(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { data: setting, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'defaultTrainingEndDate')
      .maybeSingle();

    if (error) {
      console.error('Error fetching global end date setting:', error);
    }

    return NextResponse.json({ defaultTrainingEndDate: setting?.value || null });
  } catch (error) {
    console.error('PATCH students global end date error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

