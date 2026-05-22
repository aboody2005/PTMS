'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Leaflet must be dynamically imported - no SSR
const MapComponent = dynamic(() => import('./MapInner'), { ssr: false, loading: () => (
  <div style={{ height: 300, background: 'var(--bg-hover)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
    Loading map...
  </div>
) });

export default function LocationPicker({ lat, lng, onChange }) {
  return <MapComponent lat={lat} lng={lng} onChange={onChange} />;
}
