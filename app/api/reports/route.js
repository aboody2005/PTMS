import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeVisit } from '@/lib/serializers';
import { cleanupDatabase } from '@/lib/dbCleanup';

// GET /api/reports - Generate reports data
export async function GET(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await cleanupDatabase();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // all | teacher | student
    const targetId = searchParams.get('id');

    let query = supabase
      .from('students')
      .select(`
        *,
        profile:profiles!user_id(*),
        location:locations!location_id(*),
        teacher:profiles!teacher_id(*)
      `);

    if (decoded.role === 'teacher') {
      query = query.eq('teacher_id', decoded.userId);
    } else if (decoded.role === 'student') {
      query = query.eq('user_id', decoded.userId);
    } else if (type === 'teacher' && targetId) {
      query = query.eq('teacher_id', targetId);
    } else if (type === 'student' && targetId) {
      query = query.eq('id', targetId);
    }

    const { data: students, error: studentsError } = await query;

    if (studentsError) {
      console.error('Error fetching reports students:', studentsError);
      return NextResponse.json({ message: 'Error fetching students data' }, { status: 500 });
    }

    // Filter out records where profile was not found (shouldn't happen with FK constraints)
    const validStudents = (students || []).filter(s => s.profile != null);

    // Get visit data for each student
    const reportsData = await Promise.all(validStudents.map(async (student) => {
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('student_id', student.id)
        .order('visited_at', { ascending: false });

      if (visitsError) {
        console.error(`Error fetching visits for student ${student.id}:`, visitsError);
      }

      const serializedVisits = (visitsData || []).map(serializeVisit);

      return {
        student: {
          id: student.id,
          name: student.profile?.name || '',
          email: decoded.role === 'teacher' ? undefined : student.profile?.email,
          phone: student.profile?.phone || '',
          gender: student.profile?.gender || '',
          university: student.university || '',
          pharmacyName: student.pharmacy_name || '',
          startDate: student.start_date || null,
          endDate: student.end_date || null,
          status: student.status || 'active',
          location: student.location?.name || null,
          city: student.location?.city || null,
          locationId: student.location?.id || null,
          latitude: student.latitude || null,
          longitude: student.longitude || null,
          teacher: (student.teacher && student.teacher.is_active !== false) ? student.teacher.name : null,
        },
        visits: serializedVisits,
        visitCount: serializedVisits.length,
        lastVisit: serializedVisits[0]?.visitedAt || null,
      };
    }));

    // Statistics for dashboard
    const stats = {
      totalStudents: reportsData.length,
      totalVisits: reportsData.reduce((acc, r) => acc + r.visitCount, 0),
      activeStudents: reportsData.filter(r => r.student.status === 'active').length,
      completedStudents: reportsData.filter(r => r.student.status === 'completed').length,
    };

    // Sort alphabetically by student name
    reportsData.sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));

    return NextResponse.json({ reports: reportsData, stats });
  } catch (error) {
    console.error('GET reports error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
