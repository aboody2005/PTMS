'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/context/LanguageContext';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const customIcon = typeof window !== 'undefined' ? new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
}) : null;

function LocationMarker({ position, setPosition, onChange, isPicker }) {
  const markerRef = useRef(null);
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
          if (onChange) {
            onChange({ lat: latLng.lat, lng: latLng.lng });
          }
        }
      },
    }),
    [onChange, setPosition]
  );

  const map = useMapEvents({
    click(e) {
      if (!isPicker) return;
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      if (onChange) {
        onChange({ lat, lng });
      }
    },
  });

  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return position && position[0] && position[1] ? (
    <Marker 
      position={position} 
      icon={customIcon} 
      draggable={isPicker} 
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  ) : null;
}

export default function MapInner({ lat, lng, onChange }) {
  const { locale, t } = useTranslation();
  const defaultLat = lat || 33.3152;
  const defaultLng = lng || 44.3661;
  
  const [position, setPosition] = useState([defaultLat, defaultLng]);
  const [detecting, setDetecting] = useState(false);

  const isPicker = !!onChange;

  useEffect(() => {
    if (lat && lng && (position[0] !== lat || position[1] !== lng)) {
      setPosition([lat, lng]);
    }
  }, [lat, lng, position]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      return toast.error(locale === 'ar' ? 'تحديد الموقع الجغرافي غير مدعوم في متصفحك.' : 'Geolocation is not supported by your browser.');
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setPosition([newLat, newLng]);
        if (onChange) {
          onChange({ lat: newLat, lng: newLng });
        }
        toast.success(locale === 'ar' ? 'تم تحديد موقعك بنجاح!' : 'Location detected successfully!');
        setDetecting(false);
      },
      (err) => {
        console.error(err);
        toast.error(locale === 'ar' ? 'تعذر الحصول على الموقع. يرجى تفعيل إذن الوصول للموقع.' : 'Unable to retrieve location. Please allow location permissions.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualChange = (field, val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const nextPos = field === 'lat' ? [num, position[1]] : [position[0], num];
      setPosition(nextPos);
      if (onChange) {
        onChange({ lat: nextPos[0], lng: nextPos[1] });
      }
    }
  };

  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${position[0]},${position[1]}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Map Container */}
      <div style={{ position: 'relative', width: '100%', height: 320, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 1 }}>
        <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} onChange={onChange} isPicker={isPicker} />
        </MapContainer>
      </div>

      {/* Info & Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {locale === 'ar' ? '📍 الإحداثيات الحالية:' : '📍 Current Coordinates:'} <strong>{position[0]?.toFixed(5)}</strong>, <strong>{position[1]?.toFixed(5)}</strong>
          </p>
          
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {locale === 'ar' ? '🗺️ فتح في خرائط جوجل' : '🗺️ Open in Google Maps'}
          </a>
        </div>

        {isPicker && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4, padding: 12, background: 'var(--bg-hover)', borderRadius: 'var(--radius)' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={detectLocation}
                disabled={detecting}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                {detecting 
                  ? (locale === 'ar' ? '📡 جاري تحديد الموقع...' : '📡 Detecting...') 
                  : (locale === 'ar' ? '📍 استخدام موقع الـ GPS الحالي الخاص بي' : '📍 Use My Current GPS Location')}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{locale === 'ar' ? 'خط العرض (Latitude)' : 'Latitude'}</label>
                <input
                  type="number"
                  step="any"
                  className="form-control text-sm"
                  value={position[0] || ''}
                  onChange={(e) => handleManualChange('lat', e.target.value)}
                  style={{ padding: '6px 10px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{locale === 'ar' ? 'خط الطول (Longitude)' : 'Longitude'}</label>
                <input
                  type="number"
                  step="any"
                  className="form-control text-sm"
                  value={position[1] || ''}
                  onChange={(e) => handleManualChange('lng', e.target.value)}
                  style={{ padding: '6px 10px' }}
                />
              </div>
            </div>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              {locale === 'ar' 
                ? '* انقر على الخريطة لتحديد الموقع يدوياً، أو اسحب العلامة الزرقاء، أو استخدم زر موقع الـ GPS الحالي.' 
                : '* Click on the map to pin your location manually, drag the blue marker, or use the current GPS location button.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
