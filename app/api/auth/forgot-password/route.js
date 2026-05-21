import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

// POST /api/auth/forgot-password - Request reset token
export async function POST(request) {
  try {
    const { email } = await request.json();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !profile) {
      // Return success even if not found (security best practice)
      return NextResponse.json({ message: 'If the email exists, a reset token has been generated. Please contact your administrator to retrieve it.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await supabase
      .from('profiles')
      .update({
        reset_token: token,
        reset_token_expiry: expiry,
      })
      .eq('id', profile.id);

    return NextResponse.json({
      message: 'If the email exists, a reset token has been generated. Please contact your administrator to retrieve it.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

