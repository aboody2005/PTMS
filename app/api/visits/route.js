import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeVisit } from '@/lib/serializers';

// POST /api/visits - Record a teacher visit
export async function POST(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'teacher') {
      return NextResponse.json({ message: 'Only teachers can record visits' }, { status: 403 });
    }

    const { studentId, notes } = await request.json();

    if (!studentId) {
      return NextResponse.json({ message: 'studentId is required' }, { status: 400 });
    }

    // Verify if a visit already exists for this student
    const { data: existingVisit } = await supabase
      .from('visits')
      .select('id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingVisit) {
      return NextResponse.json({ message: 'Student has already been visited' }, { status: 400 });
    }

    // Fetch teacher name from DB
    const { data: teacher } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', decoded.userId)
      .single();

    if (!teacher) {
      return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });
    }

    // Fetch student with user info
    const { data: student } = await supabase
      .from('students')
      .select(`
        *,
        profiles!user_id(*)
      `)
      .eq('id', studentId)
      .single();

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    const studentProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
    const studentName = studentProfile?.name || 'Student';
    const studentUserId = studentProfile?.id;

    // Create the visit record
    const { data: visit, error: createError } = await supabase
      .from('visits')
      .insert({
        student_id: studentId,
        teacher_id: decoded.userId,
        teacher_name: teacher.name,
        student_name: studentName,
        notes: notes || '',
        visited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating visit:', createError);
      return NextResponse.json({ message: 'Error recording visit: ' + createError.message }, { status: 500 });
    }

    // Mark student as completed when visited by teacher
    await supabase
      .from('students')
      .update({ status: 'completed' })
      .eq('id', studentId);

    // Notify the student
    if (studentUserId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: studentUserId,
          message: `Your training site was visited and confirmed by ${teacher.name}.`,
          type: 'success',
        });
    }

    return NextResponse.json({ 
      message: 'Visit recorded successfully', 
      visit: serializeVisit(visit) 
    }, { status: 201 });
  } catch (error) {
    console.error('Visit POST error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

// GET /api/visits - Get visits (filter by studentId or teacherId)
export async function GET(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const teacherId = searchParams.get('teacherId');

    const filter = {};
    if (studentId) filter.student_id = studentId;
    if (teacherId) filter.teacher_id = teacherId;

    // Teachers only see their own visits unless querying a specific student
    if (decoded.role === 'teacher' && !studentId) {
      filter.teacher_id = decoded.userId;
    }

    // Students only see their own visits
    if (decoded.role === 'student') {
      const { data: myStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', decoded.userId)
        .maybeSingle();

      if (myStudent) {
        filter.student_id = myStudent.id;
      } else {
        return NextResponse.json({ visits: [] });
      }
    }

    let query = supabase.from('visits').select('*');
    for (const [key, val] of Object.entries(filter)) {
      query = query.eq(key, val);
    }

    const { data: rawVisits, error } = await query
      .order('visited_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching visits:', error);
      return NextResponse.json({ message: 'Error fetching visits' }, { status: 500 });
    }

    const visits = (rawVisits || []).map(serializeVisit);
    return NextResponse.json({ visits });
  } catch (error) {
    console.error('Visit GET error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

