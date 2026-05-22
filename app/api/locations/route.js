import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { serializeLocation } from '@/lib/serializers';

// GET /api/locations
export async function GET(request) {
  try {
    const { data: rawLocations, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching locations:', error);
      return NextResponse.json({ message: 'Error fetching locations' }, { status: 500 });
    }

    const locations = (rawLocations || []).map(serializeLocation);
    return NextResponse.json({ locations });
  } catch (error) {
    console.error('GET locations error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/locations
export async function POST(request) {
  try {
    const { name, city, region } = await request.json();
    if (!name || !city) {
      return NextResponse.json({ message: 'Name and city are required' }, { status: 400 });
    }

    const { data: location, error } = await supabase
      .from('locations')
      .insert({
        name,
        city,
        region: region || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return NextResponse.json({ message: 'Error creating location: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Location created', 
      location: serializeLocation(location) 
    }, { status: 201 });
  } catch (error) {
    console.error('POST location error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

