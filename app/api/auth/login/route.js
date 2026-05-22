import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { serializeUser } from '@/lib/serializers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Sign in the user via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Fetch user profile to verify isActive status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile || profile.is_active === false) {
      // Sign them out of Supabase auth so session doesn't linger
      await supabase.auth.signOut();
      return NextResponse.json({ message: 'Your account is inactive' }, { status: 403 });
    }

    const token = data.session?.access_token || '';

    const response = NextResponse.json({
      message: 'Login successful',
      user: serializeUser(profile),
      token,
    });

    if (token) {
      response.cookies.set('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600, path: '/' });
    }
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

