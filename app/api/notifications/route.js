import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeNotification } from '@/lib/serializers';

// GET /api/notifications
export async function GET(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // Fetch latest 20 notifications
    const { data: notificationsData, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return NextResponse.json({ message: 'Error fetching notifications' }, { status: 500 });
    }

    // Fetch unread count
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', decoded.userId)
      .eq('is_read', false);

    if (countError) {
      console.error('Error fetching notifications count:', countError);
      return NextResponse.json({ message: 'Error fetching notifications count' }, { status: 500 });
    }

    const notifications = (notificationsData || []).map(serializeNotification);
    const unreadCount = count || 0;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark all as read
export async function PUT(request) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', decoded.userId);

    if (updateError) {
      console.error('Error updating notifications:', updateError);
      return NextResponse.json({ message: 'Error updating notifications' }, { status: 500 });
    }

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('PUT notifications error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
