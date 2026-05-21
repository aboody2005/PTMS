import { supabase } from './supabase';

export async function verifyToken(token) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return {
      userId: user.id,
      role: user.user_metadata?.role || 'student',
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('token='));
    if (tokenCookie) return tokenCookie.split('=')[1].trim();
  }
  return null;
}

export async function authenticate(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return await verifyToken(token);
}
