/**
 * api.js — Central data layer
 *
 * All methods now call Supabase directly from the browser using the anon key +
 * the authenticated session. RLS policies enforce role-based access server-side.
 *
 * The public interface (method signatures and response shapes) is kept identical
 * to the previous fetch-based version so no page components need to change.
 */
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { serializeUser, serializeStudent, serializeLocation, serializeVisit, serializeNotification } from '@/lib/serializers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Internal helpers ─────────────────────────────────────────

/** Get the current authenticated user id */
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Throw a standardized error from a Supabase query */
function throwError(error, fallback = 'Request failed') {
  throw new Error(error?.message || fallback);
}

// ── Auth ─────────────────────────────────────────────────────

export const api = {
  auth: {
    /**
     * Login: handled entirely by AuthContext (supabase.auth.signInWithPassword).
     * This stub is kept for backward compat with any direct api.auth.login calls.
     */
    login: async (body) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error) throwError(error, 'Invalid email or password');
      return data;
    },

    /** Registration via client-side signUp */
    /** Registration via server-side to bypass SMTP and verification */
    register: async (body) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return { user: data.user };
    },

    /** Get current user profile from Supabase */
    me: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Unauthorized');
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error || !profile) throw new Error('User not found');
      return { user: serializeUser(profile) };
    },

    /** Forgot password — generates a reset token stored in the profiles table */
    forgotPassword: async (body) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', body.email)
        .maybeSingle();

      if (!profile) {
        // Return success even if email not found (security best practice)
        return { message: 'If the email exists, a reset token has been generated. Please contact your administrator to retrieve it.' };
      }

      // Generate token client-side (crypto.randomUUID is available in browsers)
      const token = generateToken();
      const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      await supabase
        .from('profiles')
        .update({ reset_token: token, reset_token_expiry: expiry })
        .eq('id', profile.id);

      return { message: 'If the email exists, a reset token has been generated. Please contact your administrator to retrieve it.' };
    },

    /** Reset password using the token stored in profiles */
    resetPassword: async (body) => {
      const { token, password } = body;
      if (!token || !password) throw new Error('Token and password required');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');

      return { message: 'Password reset successfully' };
    },
  },

  // ── Users ─────────────────────────────────────────────────

  users: {
    /** List users — admin only (RLS enforces this via is_admin()) */
    list: async (params = {}) => {
      const page = parseInt(params.page) || 1;
      const limit = parseInt(params.limit) || 10;
      const role = params.role;
      const search = params.search || '';

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      if (role) query = query.eq('role', role);
      if (search) query = query.ilike('name', `%${search}%`);

      const { data: profiles, count, error } = await query
        .order('name', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throwError(error, 'Error fetching users');

      const users = (profiles || []).map(serializeUser);
      const total = count || 0;
      return { users, total, page, totalPages: Math.ceil(total / limit) };
    },

    /** Get a single user by id */
    get: async (id) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !profile) throw new Error('User not found');
      return { user: serializeUser(profile) };
    },

    /** Create user — server-side to bypass email verification and rate limits */
    create: async (body) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      return { message: 'User created successfully', user: data.user };
    },

    /** Update user — client-side profile and auth updates */
    update: async (id, body) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      // If updating own auth credentials
      if (authUser && authUser.id === id) {
        if (body.password) {
          const { error: authError } = await supabase.auth.updateUser({ password: body.password });
          if (authError) throw new Error(authError.message);
        }
        if (body.email) {
          const { error: authError } = await supabase.auth.updateUser({ email: body.email });
          if (authError) throw new Error(authError.message);
        }
      }

      // Update profiles table fields
      const updateData = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.gender !== undefined) updateData.gender = body.gender;
      if (body.profileImage !== undefined) updateData.profile_image = body.profileImage;

      if (Object.keys(updateData).length > 0) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throwError(error, 'Profile update failed');
        return { message: 'User updated', user: serializeUser(profile) };
      }

      return { message: 'User updated' };
    },

    /** Delete user — calls the secure backend route to remove them from Supabase Auth and database */
    delete: async (id) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      return { message: 'User deleted successfully' };
    },

    /** Generate a reset token for a user (admin only) — client-side update */
    generateResetToken: async (id) => {
      const token = generateToken();
      const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      const { data, error } = await supabase
        .from('profiles')
        .update({
          reset_token: token,
          reset_token_expiry: expiry,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throwError(error, 'Failed to generate reset token');

      return {
        message: 'Reset token generated successfully',
        resetToken: token,
        resetTokenExpiry: expiry,
      };
    },
  },

  // ── Students ──────────────────────────────────────────────

  students: {
    /** List students with pagination, search, and filters */
    list: async (params = {}) => {
      const page = parseInt(params.page) || 1;
      const limit = parseInt(params.limit) || 10;
      const search = params.search || '';
      const locationId = params.locationId;
      const status = params.status;

      // Fetch current user role to apply client-side role scoping
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser?.id)
        .single();
      const role = currentProfile?.role || 'student';

      let query = supabase
        .from('students')
        .select(`
          *,
          profiles!user_id(*),
          locations(*),
          teacher:profiles!teacher_id(*)
        `);

      if (locationId) query = query.eq('location_id', locationId);
      if (status) query = query.eq('status', status);
      // RLS handles teacher/student scoping; but we also add it here for
      // explicit query scoping when role is known:
      if (role === 'teacher') query = query.eq('teacher_id', authUser.id);

      const { data: rawStudents, error } = await query;
      if (error) throwError(error, 'Error fetching students');

      // Fetch all visits in one call to check isVisited
      const { data: rawVisits } = await supabase.from('visits').select('student_id, visited_at');
      const visits = rawVisits || [];

      // Helper: clear inactive teacher reference
      const cleanStudentTeacher = (student) => {
        const teacherProfile = Array.isArray(student.teacher) ? student.teacher[0] : student.teacher;
        if (teacherProfile && teacherProfile.is_active === false) {
          student.teacher = null;
          student.teacher_id = null;
        }
        return student;
      };

      // Filter out orphaned records & apply search
      let processed = (rawStudents || [])
        .filter(s => {
          const userProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          return userProfile !== null && userProfile !== undefined;
        })
        .map(cleanStudentTeacher);

      if (search) {
        processed = processed.filter(s => {
          const userProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          const matchesName = userProfile?.name?.toLowerCase().includes(search.toLowerCase());
          const matchesEmail = role !== 'teacher' && userProfile?.email?.toLowerCase().includes(search.toLowerCase());
          return matchesName || matchesEmail;
        });
      }

      // Sort by name
      processed.sort((a, b) => {
        const aProfile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        const bProfile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
        return (aProfile?.name || '').localeCompare(bProfile?.name || '', 'ar');
      });

      const total = processed.length;
      const paginated = processed.slice((page - 1) * limit, page * limit);

      const students = paginated.map(s => {
        const userProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        const locationData = Array.isArray(s.locations) ? s.locations[0] : s.locations;
        const teacherProfile = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher;

        const serialized = serializeStudent(s, userProfile, locationData, teacherProfile);

        // Hide email for teacher role
        if (role === 'teacher' && serialized.userId) {
          delete serialized.userId.email;
        }

        // Enrich with visit info
        const visit = visits.find(v => v.student_id === s.id);
        return {
          ...serialized,
          isVisited: !!visit,
          visitDate: visit ? visit.visited_at : null,
        };
      });

      return { students, total, page, totalPages: Math.ceil(total / limit) };
    },

    /** Get a single student by id */
    get: async (id) => {
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

      if (error || !student) throw new Error('Student not found');

      const { data: visit } = await supabase
        .from('visits')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();

      const userProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
      const locationData = Array.isArray(student.locations) ? student.locations[0] : student.locations;
      const teacherProfile = Array.isArray(student.teacher) ? student.teacher[0] : student.teacher;

      const serialized = serializeStudent(student, userProfile, locationData, teacherProfile);
      return {
        student: {
          ...serialized,
          isVisited: !!visit,
          visitDate: visit ? visit.visited_at : null,
        },
      };
    },

    /** Get the current student's own profile */
    my: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Unauthorized');

      const { data: student, error } = await supabase
        .from('students')
        .select(`
          *,
          profiles!user_id(*),
          locations(*),
          teacher:profiles!teacher_id(*)
        `)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (error || !student) throw new Error('Student profile not found');

      const userProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
      const locationData = Array.isArray(student.locations) ? student.locations[0] : student.locations;
      const teacherProfile = Array.isArray(student.teacher) ? student.teacher[0] : student.teacher;

      return { student: serializeStudent(student, userProfile, locationData, teacherProfile) };
    },

    /** Update a student record */
    update: async (id, body) => {
      const { university, pharmacyName, startDate, endDate, locationId, latitude, longitude, teacherId, status, attendanceStart, attendanceEnd, trainingDays } = body;

      // Get current user role to enforce permission logic
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser?.id)
        .single();
      const role = currentProfile?.role || 'student';

      const updateData = {};
      if (university !== undefined) updateData.university = university;
      if (pharmacyName !== undefined) updateData.pharmacy_name = pharmacyName;
      if (startDate !== undefined) updateData.start_date = startDate || null;
      if (endDate !== undefined) updateData.end_date = endDate || null;
      if (locationId !== undefined) updateData.location_id = locationId || null;
      if (latitude !== undefined) updateData.latitude = latitude || null;
      if (longitude !== undefined) updateData.longitude = longitude || null;
      if (teacherId !== undefined) updateData.teacher_id = teacherId || null;
      if (status !== undefined && role === 'admin') updateData.status = status;
      if (attendanceStart !== undefined) updateData.attendance_start = attendanceStart || null;
      if (attendanceEnd !== undefined) updateData.attendance_end = attendanceEnd || null;
      if (trainingDays !== undefined) updateData.training_days = Array.isArray(trainingDays) ? trainingDays : [];

      // Notify student of teacher assignment change
      if (teacherId !== undefined) {
        const { data: existing } = await supabase
          .from('students')
          .select('teacher_id, user_id')
          .eq('id', id)
          .single();

        if (existing && teacherId !== existing.teacher_id) {
          await supabase.from('notifications').insert({
            user_id: existing.user_id,
            message: 'A teacher has been assigned to your profile.',
            type: 'info',
          });
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('students').update(updateData).eq('id', id);
        if (error) throwError(error, 'Update failed');
      }

      const { data: updatedStudent } = await supabase.from('students').select('*').eq('id', id).single();
      return { message: 'Student updated', student: updatedStudent };
    },

    /** Bulk update — set global training end date (admin only) */
    updateBulk: async (body) => {
      const { endDate } = body;

      // 1. Save as global setting
      const { error: settingError } = await supabase
        .from('settings')
        .upsert({ key: 'defaultTrainingEndDate', value: endDate || '' }, { onConflict: 'key' });
      if (settingError) throwError(settingError, 'Error saving global setting');

      // 2. Update all active/completed students
      const { error: updateError } = await supabase
        .from('students')
        .update({ end_date: endDate || null })
        .in('status', ['active', 'completed']);
      if (updateError) throwError(updateError, 'Error updating students');

      return {
        message: 'Global end date saved.',
        defaultTrainingEndDate: endDate || null,
      };
    },

    /** Get the global training end date setting */
    getGlobalEndDate: async () => {
      const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'defaultTrainingEndDate')
        .maybeSingle();
      return { defaultTrainingEndDate: setting?.value || null };
    },

    /** Get whether student edits are locked */
    getLockStudentEdits: async () => {
      const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'lockStudentEdits')
        .maybeSingle();
      return { lockStudentEdits: setting?.value === 'true' };
    },

    /** Set whether student edits are locked */
    setLockStudentEdits: async (lockValue) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'lockStudentEdits', value: lockValue ? 'true' : 'false' }, { onConflict: 'key' });
      if (error) throwError(error, 'Error saving lock setting');
      return { lockStudentEdits: lockValue };
    },
  },

  // ── Teachers ──────────────────────────────────────────────

  teachers: {
    /** List all active teachers */
    list: async () => {
      const { data: rawTeachers, error } = await supabase
        .from('profiles')
        .select(`*, teachers!user_id(*)`)
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throwError(error, 'Error fetching teachers');

      const teachers = (rawTeachers || []).map(p => {
        const userProfile = serializeUser(p);
        const teacherObj = Array.isArray(p.teachers) ? p.teachers[0] : p.teachers;
        return {
          ...userProfile,
          profile: teacherObj ? {
            _id: teacherObj.id,
            department: teacherObj.department || '',
            specialty: teacherObj.specialty || '',
          } : null,
        };
      });

      return { teachers };
    },
  },

  // ── Locations ─────────────────────────────────────────────

  locations: {
    /** List all active locations */
    list: async () => {
      const { data: rawLocations, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('city', { ascending: true })
        .order('name', { ascending: true });

      if (error) throwError(error, 'Error fetching locations');
      return { locations: (rawLocations || []).map(serializeLocation) };
    },

    /** Create a new location (admin only) */
    create: async (body) => {
      const { name, city, region } = body;
      if (!name || !city) throw new Error('Name and city are required');

      const { data: location, error } = await supabase
        .from('locations')
        .insert({ name, city, region: region || '' })
        .select()
        .single();

      if (error) throwError(error, 'Error creating location');
      return { message: 'Location created', location: serializeLocation(location) };
    },

    /** Update a location (admin only) */
    update: async (id, body) => {
      const { name, city, region, isActive } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (city !== undefined) updateData.city = city;
      if (region !== undefined) updateData.region = region;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data: location, error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error || !location) throw new Error('Location not found');
      return { message: 'Location updated', location: serializeLocation(location) };
    },

    /** Soft-delete a location (admin only) */
    delete: async (id) => {
      // Unassign this location from all students first
      await supabase
        .from('students')
        .update({ location_id: null })
        .eq('location_id', id);

      const { error } = await supabase
        .from('locations')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throwError(error, 'Delete failed');
      return { message: 'Location deleted' };
    },
  },

  // ── Visits ────────────────────────────────────────────────

  visits: {
    /** Record a new visit (teacher only) */
    create: async (body) => {
      const { studentId, notes } = body;
      if (!studentId) throw new Error('studentId is required');

      const { data: { user: authUser } } = await supabase.auth.getUser();

      // Check if already visited
      const { data: existingVisit } = await supabase
        .from('visits')
        .select('id')
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingVisit) throw new Error('Student has already been visited');

      // Get teacher name
      const { data: teacher } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', authUser.id)
        .single();

      if (!teacher) throw new Error('Teacher not found');

      // Get student info
      const { data: student } = await supabase
        .from('students')
        .select(`*, profiles!user_id(*)`)
        .eq('id', studentId)
        .single();

      if (!student) throw new Error('Student not found');

      const studentProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
      const studentName = studentProfile?.name || 'Student';
      const studentUserId = studentProfile?.id;

      // Create visit record
      const { data: visit, error: createError } = await supabase
        .from('visits')
        .insert({
          student_id: studentId,
          teacher_id: authUser.id,
          teacher_name: teacher.name,
          student_name: studentName,
          notes: notes || '',
          visited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throwError(createError, 'Error recording visit');

      // Mark student as completed
      await supabase.from('students').update({ status: 'completed' }).eq('id', studentId);

      // Notify student
      if (studentUserId) {
        await supabase.from('notifications').insert({
          user_id: studentUserId,
          message: `Your training site was visited and confirmed.`,
          type: 'success',
        });
      }

      return { message: 'Visit recorded successfully', visit: serializeVisit(visit) };
    },

    /** List visits with optional filters */
    list: async (params = {}) => {
      const { studentId, teacherId } = params;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser?.id)
        .single();
      const role = currentProfile?.role || 'student';

      let query = supabase.from('visits').select('*');

      if (studentId) query = query.eq('student_id', studentId);
      if (teacherId) query = query.eq('teacher_id', teacherId);

      // Role-based scoping (RLS also enforces this, but explicit is safer)
      if (role === 'teacher' && !studentId) {
        query = query.eq('teacher_id', authUser.id);
      }
      if (role === 'student') {
        const { data: myStudent } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (myStudent) {
          query = query.eq('student_id', myStudent.id);
        } else {
          return { visits: [] };
        }
      }

      const { data: rawVisits, error } = await query
        .order('visited_at', { ascending: false })
        .limit(100);

      if (error) throwError(error, 'Error fetching visits');
      return { visits: (rawVisits || []).map(serializeVisit) };
    },
  },

  // ── Reports ───────────────────────────────────────────────

  reports: {
    /** Generate report data */
    get: async (params = {}) => {
      const { type, id: targetId } = params;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser?.id)
        .single();
      const role = currentProfile?.role || 'student';

      let query = supabase
        .from('students')
        .select(`
          *,
          profile:profiles!user_id(*),
          location:locations!location_id(*),
          teacher:profiles!teacher_id(*)
        `);

      if (role === 'teacher') {
        query = query.eq('teacher_id', authUser.id);
      } else if (role === 'student') {
        query = query.eq('user_id', authUser.id);
      } else if (type === 'teacher' && targetId) {
        query = query.eq('teacher_id', targetId);
      } else if (type === 'student' && targetId) {
        query = query.eq('id', targetId);
      }

      const { data: students, error: studentsError } = await query;
      if (studentsError) throwError(studentsError, 'Error fetching students data');

      const validStudents = (students || []).filter(s => s.profile != null);

      // Fetch all visits in one call for efficiency
      const studentIds = validStudents.map(s => s.id);
      let allVisits = [];
      if (studentIds.length > 0) {
        const { data: visitsData } = await supabase
          .from('visits')
          .select('*')
          .in('student_id', studentIds)
          .order('visited_at', { ascending: false });
        allVisits = visitsData || [];
      }

      const reportsData = validStudents.map(student => {
        const serializedVisits = allVisits
          .filter(v => v.student_id === student.id)
          .map(serializeVisit);

        return {
          student: {
            id: student.id,
            name: student.profile?.name || '',
            email: role === 'teacher' ? undefined : student.profile?.email,
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
            teacher: (student.teacher && student.teacher.is_active !== false)
              ? student.teacher.name
              : null,
          },
          visits: serializedVisits,
          visitCount: serializedVisits.length,
          lastVisit: serializedVisits[0]?.visitedAt || null,
        };
      });

      const stats = {
        totalStudents: reportsData.length,
        totalVisits: reportsData.reduce((acc, r) => acc + r.visitCount, 0),
        activeStudents: reportsData.filter(r => r.student.status === 'active').length,
        completedStudents: reportsData.filter(r => r.student.status === 'completed').length,
      };

      reportsData.sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));

      return { reports: reportsData, stats };
    },
  },

  // ── Notifications ─────────────────────────────────────────

  notifications: {
    /** List notifications for the current user */
    list: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Unauthorized');

      const { data: notificationsData, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throwError(fetchError, 'Error fetching notifications');

      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      if (countError) throwError(countError, 'Error fetching notifications count');

      return {
        notifications: (notificationsData || []).map(serializeNotification),
        unreadCount: count || 0,
      };
    },

    /** Mark all notifications as read */
    markAllRead: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Unauthorized');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', authUser.id);

      if (error) throwError(error, 'Error updating notifications');
      return { message: 'All notifications marked as read' };
    },
  },
};

// ── Utilities ─────────────────────────────────────────────────

/**
 * Generate a random hex token using the Web Crypto API (browser-safe).
 */
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}
