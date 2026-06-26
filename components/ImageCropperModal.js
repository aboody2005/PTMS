'use client';
import { useState, useRef, useEffect } from 'react';

export default function ImageCropperModal({ imageSrc, onCrop, onClose, locale }) {
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const getBaseDimensions = () => {
    if (!imgRef.current) return { width: 300, height: 300 };
    const img = imgRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const ar = naturalWidth / naturalHeight;

    let baseWidth = 300;
    let baseHeight = 300;

    if (ar > 1) {
      baseWidth = 300;
      baseHeight = 300 / ar;
    } else {
      baseWidth = 300 * ar;
      baseHeight = 300;
    }
    return { width: baseWidth, height: baseHeight };
  };

  const clampOffset = (x, y, currentZoom) => {
    const { width: baseWidth, height: baseHeight } = getBaseDimensions();
    const w = baseWidth * currentZoom;
    const h = baseHeight * currentZoom;

    const minX = 100 - w / 2;
    const maxX = w / 2 - 100;
    const minY = 100 - h / 2;
    const maxY = h / 2 - 100;

    const finalMinX = Math.min(minX, maxX);
    const finalMaxX = Math.max(minX, maxX);
    const finalMinY = Math.min(minY, maxY);
    const finalMaxY = Math.max(minY, maxY);

    return {
      x: Math.max(finalMinX, Math.min(finalMaxX, x)),
      y: Math.max(finalMinY, Math.min(finalMaxY, y)),
    };
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const ar = naturalWidth / naturalHeight;

    let baseWidth = 300;
    let baseHeight = 300;

    if (ar > 1) {
      baseWidth = 300;
      baseHeight = 300 / ar;
    } else {
      baseWidth = 300 * ar;
      baseHeight = 300;
    }

    const calculatedMinZoom = Math.max(200 / baseWidth, 200 / baseHeight);
    const calculatedMaxZoom = Math.max(naturalWidth / baseWidth, calculatedMinZoom * 1.5, 3);

    setMinZoom(calculatedMinZoom);
    setMaxZoom(calculatedMaxZoom);
    setZoom(calculatedMinZoom);
    setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y, zoom));
  }, [zoom]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.current.x;
    const rawY = e.clientY - dragStart.current.y;
    setOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - dragStart.current.x;
    const rawY = e.touches[0].clientY - dragStart.current.y;
    setOffset(clampOffset(rawX, rawY, zoom));
  };

  const handleSave = () => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const container = containerRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const vpLeft = containerRect.left + 50;
    const vpTop = containerRect.top + 50;

    const cropX = vpLeft - imgRect.left;
    const cropY = vpTop - imgRect.top;

    const scale = img.naturalWidth / imgRect.width;

    ctx.drawImage(
      img,
      cropX * scale,
      cropY * scale,
      200 * scale,
      200 * scale,
      0,
      0,
      256,
      256
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onCrop(croppedDataUrl);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }} onMouseUp={handleMouseUp}>
      <div className="modal" style={{ maxWidth: 360, padding: 20 }} onMouseUp={handleMouseUp}>
        <div className="modal-header" style={{ marginBottom: 16 }}>
          <h4>{locale === 'ar' ? 'قص وضبط الصورة' : 'Crop & Adjust Image'}</h4>
          <button type="button" onClick={onClose} className="btn btn-icon btn-secondary">✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, overflow: 'hidden' }}>
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: 300,
              height: 300,
              backgroundColor: '#111827',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="To crop"
              onLoad={handleImageLoad}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                maxWidth: '100%',
                maxHeight: '100%',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                border: '2px solid var(--accent)',
                borderRadius: '50%',
                width: 200,
                height: 200,
                margin: 'auto',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>{locale === 'ar' ? 'تصغير' : 'Zoom Out'}</span>
              <span>{locale === 'ar' ? 'تكبير' : 'Zoom In'}</span>
            </div>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {locale === 'ar' ? 'قص وحفظ' : 'Crop & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
