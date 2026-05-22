import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeUser, serializeTeacher } from '@/lib/serializers';
import { cleanupDatabase } from '@/lib/dbCleanup';

// GET /api/teachers
export async function GET(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await cleanupDatabase();

    const { data: rawTeachers, error } = await supabase
      .from('profiles')
      .select(`
        *,
        teachers!user_id(*)
      `)
      .eq('role', 'teacher')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching teachers:', error);
      return NextResponse.json({ message: 'Error fetching teachers' }, { status: 500 });
    }

    const teachers = (rawTeachers || []).map(p => {
      const userProfile = serializeUser(p);
      const teacherObj = Array.isArray(p.teachers) ? p.teachers[0] : p.teachers;
      const teacherProfile = serializeTeacher(teacherObj);
      return {
        ...userProfile,
        profile: teacherProfile,
      };
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('GET teachers error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

