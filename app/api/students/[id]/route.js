import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeStudent } from '@/lib/serializers';

// GET /api/students/[id]
export async function GET(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const { data: student, error } = await supabase
      .from('students')
      .select(`
        *,
        profiles!user_id(*),
        locations(*),
        teacher:profiles!teacher_id(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !student) return NextResponse.json({ message: 'Student not found' }, { status: 404 });

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('*')
      .eq('student_id', student.id)
      .maybeSingle();

    const userProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
    const locationData = Array.isArray(student.locations) ? student.locations[0] : student.locations;
    const teacherProfile = Array.isArray(student.teacher) ? student.teacher[0] : student.teacher;

    const serialized = serializeStudent(student, userProfile, locationData, teacherProfile);
    const enrichedStudent = {
      ...serialized,
      isVisited: !!visit,
      visitDate: visit ? visit.visited_at : null
    };

    return NextResponse.json({ student: enrichedStudent });
  } catch (error) {
    console.error('GET student by id error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/students/[id]
export async function PUT(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const { data: student, error: getError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !student) return NextResponse.json({ message: 'Student not found' }, { status: 404 });

    // Only the student themselves, their teacher, or admin can update
    const isOwner = student.user_id === decoded.userId;
    if (!isOwner && decoded.role !== 'admin' && decoded.role !== 'teacher') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { university, pharmacyName, startDate, endDate, locationId, latitude, longitude, teacherId, status } = body;

    const updateData = {};
    if (university !== undefined) updateData.university = university;
    if (pharmacyName !== undefined) updateData.pharmacy_name = pharmacyName;
    if (startDate !== undefined) updateData.start_date = startDate || null;
    if (endDate !== undefined && decoded.role === 'admin') updateData.end_date = endDate || null;
    if (locationId !== undefined) updateData.location_id = locationId || null;
    if (latitude !== undefined) updateData.latitude = latitude || null;
    if (longitude !== undefined) updateData.longitude = longitude || null;
    if (teacherId !== undefined) updateData.teacher_id = teacherId || null;
    if (status !== undefined && decoded.role === 'admin') updateData.status = status;

    if (teacherId !== undefined && teacherId !== student.teacher_id) {
      // Notify student of new teacher assignment
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: student.user_id,
          message: 'A teacher has been assigned to your profile.',
          type: 'info',
        });
      if (notifError) console.error('Notification creation error:', notifError);
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        return NextResponse.json({ message: 'Update failed: ' + updateError.message }, { status: 400 });
      }
    }

    // Get updated student
    const { data: updatedStudent } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ message: 'Student updated', student: updatedStudent });
  } catch (error) {
    console.error('PUT student by id error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

