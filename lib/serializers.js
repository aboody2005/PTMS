export function serializeUser(profile) {
  if (!profile) return null;
  return {
    _id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role || 'student',
    phone: profile.phone || '',
    gender: profile.gender || '',
    profileImage: profile.profile_image || '',
    resetToken: profile.reset_token || null,
    resetTokenExpiry: profile.reset_token_expiry || null,
    isActive: profile.is_active !== false,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  };
}

export function serializeStudent(student, profile = null, location = null, teacher = null) {
  if (!student) return null;
  return {
    _id: student.id,
    userId: profile ? serializeUser(profile) : student.user_id,
    university: student.university || '',
    pharmacyName: student.pharmacy_name || '',
    startDate: student.start_date || null,
    endDate: student.end_date || null,
    locationId: location ? serializeLocation(location) : student.location_id,
    latitude: student.latitude || null,
    longitude: student.longitude || null,
    teacherId: teacher ? serializeUser(teacher) : student.teacher_id,
    status: student.status || 'active',
    createdAt: student.created_at,
    updatedAt: student.updated_at
  };
}

export function serializeTeacher(teacher, profile = null) {
  if (!teacher) return null;
  return {
    _id: teacher.id,
    userId: profile ? serializeUser(profile) : teacher.user_id,
    department: teacher.department || '',
    specialty: teacher.specialty || '',
    createdAt: teacher.created_at,
    updatedAt: teacher.updated_at
  };
}

export function serializeLocation(location) {
  if (!location) return null;
  return {
    _id: location.id,
    name: location.name || '',
    city: location.city || '',
    region: location.region || '',
    isActive: location.is_active !== false,
    createdAt: location.created_at,
    updatedAt: location.updated_at
  };
}

export function serializeVisit(visit) {
  if (!visit) return null;
  return {
    _id: visit.id,
    studentId: visit.student_id,
    teacherId: visit.teacher_id,
    teacherName: visit.teacher_name || '',
    studentName: visit.student_name || '',
    visitedAt: visit.visited_at,
    notes: visit.notes || '',
    status: visit.status || 'visited',
    createdAt: visit.created_at,
    updatedAt: visit.updated_at
  };
}

export function serializeNotification(notif) {
  if (!notif) return null;
  return {
    _id: notif.id,
    userId: notif.user_id,
    message: notif.message || '',
    type: notif.type || 'info',
    isRead: !!notif.is_read,
    link: notif.link || '',
    createdAt: notif.created_at,
    updatedAt: notif.updated_at
  };
}
