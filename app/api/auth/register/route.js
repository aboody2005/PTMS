import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { serializeUser } from '@/lib/serializers';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, role, phone, gender, locationId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // 1. Create the user administratively with email automatically confirmed
    // to bypass Supabase SMTP rate limits and avoid sending verification emails
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: role || 'student',
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.status === 422) {
        return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
      }
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ message: 'Registration failed' }, { status: 400 });
    }

    // Sign in the newly created user to retrieve a session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in error after registration:', signInError);
      return NextResponse.json({ message: 'Registration succeeded but login failed: ' + signInError.message }, { status: 400 });
    }

    const token = signInData?.session?.access_token || '';

    const userId = data.user.id;
    const targetRole = role || 'student';

    // 2. Update profiles table with extra profile information (phone, gender)
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        phone: phone || '',
        gender: gender || '',
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
    }

    // 3. If student, update student-specific fields like locationId
    if (targetRole === 'student' && locationId) {
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({
          location_id: locationId,
        })
        .eq('user_id', userId);

      if (studentUpdateError) {
        console.error('Student location update error:', studentUpdateError);
      }
    }

    // Get the fully populated profile
    const { data: profile, error: profileGetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const response = NextResponse.json({
      message: 'Registration successful',
      user: serializeUser(profile || { id: userId, email, name, role: targetRole, phone, gender }),
      token,
    }, { status: 201 });

    if (token) {
      response.cookies.set('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 });
    }
    
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

