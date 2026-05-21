import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and password required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Find profile by token and verify it hasn't expired
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('reset_token', token)
      .gt('reset_token_expiry', new Date().toISOString())
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Update password in auth.users via admin API
    const { error: authError } = await supabase.auth.admin.updateUserById(profile.id, {
      password: password,
    });

    if (authError) {
      return NextResponse.json({ message: 'Error updating password: ' + authError.message }, { status: 500 });
    }

    // Clear reset token fields
    await supabase
      .from('profiles')
      .update({
        reset_token: null,
        reset_token_expiry: null,
      })
      .eq('id', profile.id);

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

