import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticate } from '@/lib/auth';
import { serializeLocation } from '@/lib/serializers';

// PUT /api/locations/[id]
export async function PUT(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, city, region, isActive } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (city !== undefined) updateData.city = city;
    if (region !== undefined) updateData.region = region;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: location, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !location) {
      return NextResponse.json({ message: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Location updated', 
      location: serializeLocation(location) 
    });
  } catch (error) {
    console.error('PUT location error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/locations/[id]
export async function DELETE(request, { params }) {
  try {
    const decoded = await authenticate(request);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('locations')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error soft-deleting location:', error);
      return NextResponse.json({ message: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Location deleted' });
  } catch (error) {
    console.error('DELETE location error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

