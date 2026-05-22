import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';
import { cleanupDatabase } from '@/lib/dbCleanup';

// GET /api/users - Get all users (admin only)
export async function GET(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await cleanupDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const role = searchParams.get('role');
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: profiles, count, error } = await query
      .order('name', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
    }

    const users = (profiles || []).map(serializeUser);
    const total = count || 0;

    return NextResponse.json({ 
      users, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error) {
    console.error('GET users error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/users - Create user (admin only)
export async function POST(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, phone, gender } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if email already registered in profiles
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
    }

    // Create user in Supabase Auth via admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: role || 'student'
      }
    });

    if (createError) {
      return NextResponse.json({ message: createError.message }, { status: 400 });
    }

    const userId = newUser.user.id;

    // Update profiles table with phone & gender
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        phone: phone || '',
        gender: gender || ''
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
    }

    // Fetch the updated profile to serialize
    const { data: profile, error: profileGetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return NextResponse.json({ 
      message: 'User created', 
      user: serializeUser(profile || { id: userId, email, name, role, phone, gender }) 
    }, { status: 201 });
  } catch (error) {
    console.error('POST user error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

