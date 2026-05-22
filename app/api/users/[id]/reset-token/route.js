import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import crypto from 'crypto';

// POST /api/users/[id]/reset-token - Generate a new reset token for a user
export async function POST(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Verify user exists in profiles
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 86400000).toISOString(); // 24 hours for admin convenience

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        reset_token: token,
        reset_token_expiry: expiry,
      })
      .eq('id', id);

    if (updateErr) {
      console.error('Error updating reset token:', updateErr);
      return NextResponse.json({ message: 'Failed to update reset token' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Reset token generated successfully',
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  } catch (error) {
    console.error('Reset token generation error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
