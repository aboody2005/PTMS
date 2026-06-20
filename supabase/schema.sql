-- ============================================================
-- PTMS Supabase Schema  
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  phone TEXT DEFAULT '',
  gender TEXT DEFAULT '' CHECK (gender IN ('male', 'female', 'other', '')),
  profile_image TEXT DEFAULT '',
  reset_token TEXT DEFAULT NULL,
  reset_token_expiry TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LOCATIONS
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  university TEXT DEFAULT '',
  pharmacy_name TEXT DEFAULT '',
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL,
  location_id UUID DEFAULT NULL REFERENCES locations(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION DEFAULT NULL,
  longitude DOUBLE PRECISION DEFAULT NULL,
  teacher_id UUID DEFAULT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  department TEXT DEFAULT '',
  specialty TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VISITS
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'visited' CHECK (status IN ('visited', 'checked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SETTINGS (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_location_id ON students(location_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_student_id ON visits(student_id);
CREATE INDEX IF NOT EXISTS idx_visits_teacher_id ON visits(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ============================================================
-- AUTO-CREATE PROFILE ON AUTH SIGNUP (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_end_date TIMESTAMPTZ;
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Insert into profiles
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    user_role
  );

  -- Insert into role-specific tables
  IF user_role = 'student' THEN
    -- Retrieve default training end date from settings
    SELECT value::TIMESTAMPTZ INTO default_end_date FROM public.settings WHERE key = 'defaultTrainingEndDate';
    
    INSERT INTO public.students (user_id, end_date)
    VALUES (NEW.id, default_end_date);
  ELSIF user_role = 'teacher' THEN
    INSERT INTO public.teachers (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER: is_admin() — checks if the current user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Per-role policies
-- The browser client uses the anon key; RLS enforces access.
-- The server admin client (service_role) bypasses RLS entirely.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ────────────────────────────────────────────────
-- Drop old blanket policies
DROP POLICY IF EXISTS "Service role full access" ON profiles;

-- Any authenticated user can read any active profile
-- (needed for teachers to see student names, admin to see everyone)
DROP POLICY IF EXISTS "Authenticated users read profiles" ON profiles;
CREATE POLICY "Authenticated users read profiles" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any profile
DROP POLICY IF EXISTS "Admin update any profile" ON profiles;
CREATE POLICY "Admin update any profile" ON profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin can insert profiles (handled by trigger, but needed for direct inserts)
DROP POLICY IF EXISTS "Admin insert profiles" ON profiles;
CREATE POLICY "Admin insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admin can delete profiles
DROP POLICY IF EXISTS "Admin delete profiles" ON profiles;
CREATE POLICY "Admin delete profiles" ON profiles
  FOR DELETE
  USING (public.is_admin());

-- ── STUDENTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access" ON students;

-- Students can read their own record
DROP POLICY IF EXISTS "Student reads own record" ON students;
CREATE POLICY "Student reads own record" ON students
  FOR SELECT
  USING (user_id = auth.uid());

-- Teachers can read students assigned to them
DROP POLICY IF EXISTS "Teacher reads assigned students" ON students;
CREATE POLICY "Teacher reads assigned students" ON students
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Admin can read all students
DROP POLICY IF EXISTS "Admin reads all students" ON students;
CREATE POLICY "Admin reads all students" ON students
  FOR SELECT
  USING (public.is_admin());

-- Students can update their own record (university, pharmacyName, location, lat/lng)
DROP POLICY IF EXISTS "Student updates own record" ON students;
CREATE POLICY "Student updates own record" ON students
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Teachers can update students assigned to them (e.g. status after visit)
DROP POLICY IF EXISTS "Teacher updates assigned student" ON students;
CREATE POLICY "Teacher updates assigned student" ON students
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Admin can update all students
DROP POLICY IF EXISTS "Admin updates all students" ON students;
CREATE POLICY "Admin updates all students" ON students
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin can insert students
DROP POLICY IF EXISTS "Admin inserts students" ON students;
CREATE POLICY "Admin inserts students" ON students
  FOR INSERT
  WITH CHECK (public.is_admin());

-- ── TEACHERS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access" ON teachers;

-- Any authenticated user can read teachers (needed for dropdowns)
DROP POLICY IF EXISTS "Authenticated read teachers" ON teachers;
CREATE POLICY "Authenticated read teachers" ON teachers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Teachers can update their own record
DROP POLICY IF EXISTS "Teacher updates own record" ON teachers;
CREATE POLICY "Teacher updates own record" ON teachers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can manage all teacher records
DROP POLICY IF EXISTS "Admin manages teachers" ON teachers;
CREATE POLICY "Admin manages teachers" ON teachers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── LOCATIONS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access" ON locations;

-- Any authenticated user can read active locations (for dropdowns/forms)
DROP POLICY IF EXISTS "Authenticated read locations" ON locations;
CREATE POLICY "Authenticated read locations" ON locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admin can write locations
DROP POLICY IF EXISTS "Admin manages locations" ON locations;
CREATE POLICY "Admin manages locations" ON locations
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── VISITS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access" ON visits;

-- Students can read their own visits (via student_id)
DROP POLICY IF EXISTS "Student reads own visits" ON visits;
CREATE POLICY "Student reads own visits" ON visits
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- Teachers can read visits they recorded
DROP POLICY IF EXISTS "Teacher reads own visits" ON visits;
CREATE POLICY "Teacher reads own visits" ON visits
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Admin can read all visits
DROP POLICY IF EXISTS "Admin reads all visits" ON visits;
CREATE POLICY "Admin reads all visits" ON visits
  FOR SELECT
  USING (public.is_admin());

-- Teachers can insert visits (record a visit)
DROP POLICY IF EXISTS "Teacher inserts visit" ON visits;
CREATE POLICY "Teacher inserts visit" ON visits
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Admin can insert/update/delete visits
DROP POLICY IF EXISTS "Admin manages visits" ON visits;
CREATE POLICY "Admin manages visits" ON visits
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── NOTIFICATIONS ────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access" ON notifications;

-- Users can read their own notifications
DROP POLICY IF EXISTS "User reads own notifications" ON notifications;
CREATE POLICY "User reads own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "User updates own notifications" ON notifications;
CREATE POLICY "User updates own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Any authenticated user can insert a notification (teachers notify students)
DROP POLICY IF EXISTS "Authenticated insert notification" ON notifications;
CREATE POLICY "Authenticated insert notification" ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin can manage all notifications
DROP POLICY IF EXISTS "Admin manages notifications" ON notifications;
CREATE POLICY "Admin manages notifications" ON notifications
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── SETTINGS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access" ON settings;

-- Any authenticated user can read settings
DROP POLICY IF EXISTS "Authenticated read settings" ON settings;
CREATE POLICY "Authenticated read settings" ON settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admin can write settings
DROP POLICY IF EXISTS "Admin manages settings" ON settings;
CREATE POLICY "Admin manages settings" ON settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- UPDATED_AT AUTO-UPDATE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PRIVILEGE GRANTS
-- ============================================================

-- 1. Grant usage on the public schema to all default roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant full administrative privileges to postgres and service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- 3. Grant basic read/write privileges to anonymous and authenticated users for client queries
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT SELECT, UPDATE, USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 4. Ensure future tables created automatically get these same permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;

-- ============================================================
-- EXTENSIONS, TRIGGERS & RPC FOR SERVERLESS MIGRATION
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Trigger to delete auth.users when a profile is deleted
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- 2. RPC function to reset password using token
CREATE OR REPLACE FUNCTION public.reset_password_with_token(p_token TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find profile by token and verify it hasn't expired
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE reset_token = p_token
    AND reset_token_expiry > NOW()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_password, gen_salt('bf', 10))
  WHERE id = v_user_id;

  -- Clear reset token in profiles
  UPDATE public.profiles
  SET reset_token = NULL,
      reset_token_expiry = NULL
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

