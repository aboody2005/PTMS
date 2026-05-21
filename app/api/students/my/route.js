import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeStudent } from '@/lib/serializers';

// GET /api/students/my - Current student's own profile
export async function GET(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { data: student, error } = await supabase
      .from('students')
      .select(`
        *,
        profiles!user_id(*),
        locations(*),
        teacher:profiles!teacher_id(*)
      `)
      .eq('user_id', decoded.userId)
      .maybeSingle();

    if (error || !student) {
      return NextResponse.json({ message: 'Student profile not found' }, { status: 404 });
    }

    const userProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
    const locationData = Array.isArray(student.locations) ? student.locations[0] : student.locations;
    const teacherProfile = Array.isArray(student.teacher) ? student.teacher[0] : student.teacher;

    const serialized = serializeStudent(student, userProfile, locationData, teacherProfile);

    return NextResponse.json({ student: serialized });
  } catch (error) {
    console.error('GET my student profile error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

