import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';
import { cleanupDatabase } from '@/lib/dbCleanup';

// GET /api/users/[id]
export async function GET(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    return NextResponse.json({ user: serializeUser(profile) });
  } catch (error) {
    console.error('GET user by id error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/users/[id]
export async function PUT(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Only admin or the user themselves can update
    if (decoded.role !== 'admin' && decoded.userId !== id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, gender, profileImage, password } = body;

    // Fetch existing user profile
    const { data: profile, error: profileGetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileGetError || !profile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (profileImage !== undefined) updateData.profile_image = profileImage;

    // Check email uniqueness if changing email
    if (email && email !== profile.email) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
      }
      updateData.email = email;
    }

    // 1. Update auth.users if email or password is changed
    const authUpdate = {};
    if (email && email !== profile.email) authUpdate.email = email;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
      }
      authUpdate.password = password;
    }

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdate);
      if (authError) {
        return NextResponse.json({ message: 'Auth update failed: ' + authError.message }, { status: 400 });
      }
    }

    // 2. Update profiles table
    if (Object.keys(updateData).length > 0) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id);

      if (profileUpdateError) {
        return NextResponse.json({ message: 'Profile update failed: ' + profileUpdateError.message }, { status: 400 });
      }
    }

    // Fetch updated profile
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ 
      message: 'User updated', 
      user: serializeUser(updatedProfile || { ...profile, ...updateData }) 
    });
  } catch (error) {
    console.error('PUT user error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Verify user exists
    const { data: profile, error: profileGetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileGetError || !profile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Delete user from auth.users (cascades down automatically to profiles, students, teachers, visits, notifications)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
    if (deleteError) {
      return NextResponse.json({ message: 'Delete failed: ' + deleteError.message }, { status: 400 });
    }

    // Clean up any remaining orphaned data in the DB
    await cleanupDatabase();

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DELETE user error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

