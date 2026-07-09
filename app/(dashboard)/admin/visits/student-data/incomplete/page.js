'use client';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

/* ─────────────────────────────────────────
   Format date safely
───────────────────────────────────────── */
function fmtDate(val, ar) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString(ar ? 'ar-IQ' : 'en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return val;
  }
}

/* ─────────────────────────────────────────
   Format time  (handles "HH:MM:SS", ISO, etc.)
───────────────────────────────────────── */
function fmtTime(val) {
  if (!val) return null;
  // If already looks like HH:MM or HH:MM:SS
  if (/^\d{1,2}:\d{2}/.test(val)) return val.slice(0, 5);
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return val;
  }
}

/* ─────────────────────────────────────────
   Days label map
───────────────────────────────────────── */
const DAY_AR = {
  saturday: 'السبت', sunday: 'الأحد', monday: 'الاثنين',
  tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة',
};
function fmtDays(days, ar) {
  if (!Array.isArray(days) || days.length === 0) return null;
  if (ar) return days.map(d => DAY_AR[d.toLowerCase()] || d).join('، ');
  return days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
}

/* ─────────────────────────────────────────
   Which fields are missing
───────────────────────────────────────── */
function getMissingFields(s, ar) {
  const m = [];
  if (!s.pharmacy_name) m.push(ar ? 'اسم الصيدلية' : 'Pharmacy Name');
  if (!s.start_date && !s.end_date) m.push(ar ? 'شهر التدريب' : 'Training Month');
  if (!s.training_days || s.training_days.length === 0) m.push(ar ? 'أيام التدريب' : 'Training Days');
  if (!s.attendance_start && !s.attendance_end) m.push(ar ? 'وقت التدريب' : 'Training Time');
  if (!s.latitude && !s.longitude) m.push(ar ? 'موقع GPS' : 'GPS Location');
  return m;
}

/* ─────────────────────────────────────────
   Missing pill badge
───────────────────────────────────────── */
function Missing({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: 'rgba(239,68,68,0.12)', color: '#ef4444',
      border: '1px solid rgba(239,68,68,0.22)',
      borderRadius: 99, padding: '2px 8px',
      fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      ✕ {label}
    </span>
  );
}

/* ─────────────────────────────────────────
   Present value cell helper
───────────────────────────────────────── */
function Val({ children, ar, missingLabel }) {
  const empty = children === null || children === undefined || children === '';
  if (empty) return <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.78rem' }}>⚠ {ar ? 'غير محدد' : 'Not set'}</span>;
  return <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{children}</span>;
}

/* ─────────────────────────────────────────
   Mobile Card
───────────────────────────────────────── */
function StudentCard({ s, idx, ar }) {
  const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
  const missing = getMissingFields(s, ar);
  const days = fmtDays(s.training_days, ar);

  return (
    <div style={{
      background: 'var(--bg-card, #1a1f2e)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '16px',
      marginBottom: 12,
      position: 'relative',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
            #{idx + 1}
          </span>
          <strong style={{ fontSize: '0.95rem' }}>{profile?.name || '—'}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {profile?.email && <div>{profile.email}</div>}
            {profile?.phone && <div>{profile.phone}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', maxWidth: '55%' }}>
          {missing.map(f => <Missing key={f} label={f} />)}
        </div>
      </div>

      {/* Data grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        <CardRow label={ar ? 'اسم الصيدلية' : 'Pharmacy'} ar={ar}>
          <Val ar={ar}>{s.pharmacy_name || ''}</Val>
        </CardRow>

        <CardRow label={ar ? 'شهر التدريب' : 'Training Month'} ar={ar}>
          {s.start_date || s.end_date ? (
            <span style={{ fontSize: '0.78rem' }}>
              {s.start_date && <div>{ar ? 'من: ' : 'From: '}<b>{fmtDate(s.start_date, ar)}</b></div>}
              {s.end_date && <div>{ar ? 'إلى: ' : 'To: '}<b>{fmtDate(s.end_date, ar)}</b></div>}
            </span>
          ) : <Val ar={ar}>{''}</Val>}
        </CardRow>

        <CardRow label={ar ? 'أيام التدريب' : 'Training Days'} ar={ar}>
          <Val ar={ar}>{days}</Val>
        </CardRow>

        <CardRow label={ar ? 'وقت التدريب' : 'Training Time'} ar={ar}>
          {s.attendance_start || s.attendance_end ? (
            <span style={{ fontSize: '0.78rem' }}>
              {s.attendance_start && <div>{ar ? 'من: ' : 'From: '}<b>{fmtTime(s.attendance_start)}</b></div>}
              {s.attendance_end && <div>{ar ? 'إلى: ' : 'To: '}<b>{fmtTime(s.attendance_end)}</b></div>}
            </span>
          ) : <Val ar={ar}>{''}</Val>}
        </CardRow>

        <CardRow label="GPS" ar={ar} fullWidth>
          {s.latitude && s.longitude ? (
            <a
              href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: '0.78rem', color: 'var(--accent)' }}
            >
              📍 {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
            </a>
          ) : <Val ar={ar}>{''}</Val>}
        </CardRow>
      </div>
    </div>
  );
}

function CardRow({ label, children, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1/-1' : undefined }}>
      <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function IncompleteDataPage() {
  const { locale } = useTranslation();
  const ar = locale === 'ar';

  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [exporting, setExporting] = useState(false);
  const [isMobile, setIsMobile]   = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ── Load ── */
  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`*, profiles!user_id(id, name, email, phone, gender)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const incomplete = (data || []).filter(s => getMissingFields(s, ar).length > 0);
      setStudents(incomplete);
    } catch {
      toast.error(ar ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s => {
      const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      return p?.name?.toLowerCase().includes(q) || p?.email?.toLowerCase().includes(q) || p?.phone?.includes(q);
    });
  }, [students, search]);

  /* ── Excel Export ── */
  const handleExport = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      const headers = ar
        ? ['#', 'اسم الطالب', 'البريد الإلكتروني', 'الهاتف', 'اسم الصيدلية', 'تاريخ البداية', 'تاريخ النهاية', 'أيام التدريب', 'وقت البداية', 'وقت النهاية', 'خط العرض', 'خط الطول', 'الحقول الناقصة']
        : ['#', 'Student Name', 'Email', 'Phone', 'Pharmacy Name', 'Start Date', 'End Date', 'Training Days', 'Start Time', 'End Time', 'Latitude', 'Longitude', 'Missing Fields'];

      const rows = filtered.map((s, i) => {
        const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return [
          i + 1,
          p?.name || '',
          p?.email || '',
          p?.phone || '',
          s.pharmacy_name || '',
          s.start_date ? fmtDate(s.start_date, ar) : '',
          s.end_date   ? fmtDate(s.end_date, ar)   : '',
          fmtDays(s.training_days, ar) || '',
          s.attendance_start ? fmtTime(s.attendance_start) : '',
          s.attendance_end   ? fmtTime(s.attendance_end)   : '',
          s.latitude  ? String(s.latitude)  : '',
          s.longitude ? String(s.longitude) : '',
          getMissingFields(s, ar).join(' | '),
        ];
      });

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [4, 26, 28, 14, 24, 16, 16, 30, 12, 12, 14, 14, 40].map(w => ({ wch: w }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, ar ? 'البيانات الناقصة' : 'Incomplete');

      // Use writeFile which handles the browser download internally
      XLSX.writeFile(wb, `incomplete_students_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(ar ? 'تم التصدير بنجاح ✓' : 'Exported successfully ✓');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error(ar ? `فشل التصدير: ${err?.message || ''}` : `Export failed: ${err?.message || ''}`);
    } finally {
      setExporting(false);
    }
  };

  /* ─────────────────────────────────── RENDER */
  return (
    <div style={{ direction: ar ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(239,68,68,0.12)', color: '#ef4444',
              width: 42, height: 42, borderRadius: 10,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0,
            }}>⚠️</span>
            {ar ? 'البيانات الغير مكتملة' : 'Incomplete Data'}
          </h1>
          <p className="text-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>
            {ar
              ? 'الطلبة الذين لم يُكملوا بيانات التدريب الأساسية'
              : 'Students missing essential training information'}
          </p>
        </div>
      </div>

      {/* Banner */}
      {!loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '12px 18px', borderRadius: 10, marginBottom: 18,
          background: students.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${students.length > 0 ? 'rgba(239,68,68,0.22)' : 'rgba(34,197,94,0.22)'}`,
        }}>
          <span style={{ fontSize: '1.5rem' }}>{students.length > 0 ? '⚠️' : '✅'}</span>
          <span style={{ fontWeight: 700, color: students.length > 0 ? '#ef4444' : '#22c55e', fontSize: '0.95rem' }}>
            {students.length > 0
              ? (ar ? `${students.length} طالب لديهم بيانات ناقصة` : `${students.length} student(s) with incomplete data`)
              : (ar ? 'جميع الطلبة أكملوا بياناتهم!' : 'All students have complete data!')}
          </span>
          {filtered.length !== students.length && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({ar ? `يظهر: ${filtered.length}` : `Showing: ${filtered.length}`})
            </span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder={ar ? 'بحث باسم الطالب أو البريد...' : 'Search by name or email...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingInlineStart: 36 }}
          />
        </div>

        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? '⏳' : '🔄'} {ar ? 'تحديث' : 'Refresh'}
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          style={{ background: 'linear-gradient(135deg,#22863a,#2ea043)', borderColor: '#22863a', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {exporting
            ? <><Spinner /> {ar ? 'جاري التصدير...' : 'Exporting...'}</>
            : <>📥 {ar ? 'تصدير Excel' : 'Export Excel'}</>}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-center" style={{ height: 220 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card flex-center" style={{ flexDirection: 'column', padding: '60px 20px', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>{search ? '🔍' : '✅'}</span>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {search
              ? (ar ? 'لا توجد نتائج' : 'No results found')
              : (ar ? 'لا يوجد طلبة ببيانات ناقصة' : 'No students with incomplete data')}
          </p>
        </div>
      ) : isMobile ? (
        /* ── MOBILE CARDS ── */
        <div>
          {filtered.map((s, idx) => (
            <StudentCard key={s.id} s={s} idx={idx} ar={ar} />
          ))}
        </div>
      ) : (
        /* ── DESKTOP TABLE ── */
        <div className="card" style={{ padding: 0, width: '100%', overflowX: 'auto' }}>
          <table style={{ tableLayout: 'fixed', width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 42 }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  '#',
                  ar ? 'اسم الطالب' : 'Student Name',
                  ar ? 'البريد / الهاتف' : 'Email / Phone',
                  ar ? 'اسم الصيدلية' : 'Pharmacy Name',
                  ar ? 'شهر التدريب' : 'Training Month',
                  ar ? 'أيام التدريب' : 'Training Days',
                  ar ? 'وقت التدريب' : 'Training Time',
                  'GPS',
                  ar ? 'الحقول الناقصة' : 'Missing Fields',
                ].map(h => <th key={h} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                const missing = getMissingFields(s, ar);
                const days = fmtDays(s.training_days, ar);

                return (
                  <tr key={s.id} style={{ verticalAlign: 'top' }}>
                    {/* # */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>

                    {/* Name */}
                    <td style={{ fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-word' }}>
                      {p?.name || '—'}
                    </td>

                    {/* Email / Phone */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                      <div>{p?.email || '—'}</div>
                      {p?.phone && <div style={{ marginTop: 2 }}>{p.phone}</div>}
                    </td>

                    {/* Pharmacy */}
                    <td style={{ wordBreak: 'break-word' }}>
                      <Val ar={ar}>{s.pharmacy_name || ''}</Val>
                    </td>

                    {/* Training Month */}
                    <td style={{ fontSize: '0.78rem' }}>
                      {s.start_date || s.end_date ? (
                        <div>
                          {s.start_date && <div style={{ color: 'var(--text-muted)' }}>{ar ? 'من: ' : 'From: '}<b>{fmtDate(s.start_date, ar)}</b></div>}
                          {s.end_date   && <div style={{ color: 'var(--text-muted)' }}>{ar ? 'إلى: ' : 'To: '}<b>{fmtDate(s.end_date, ar)}</b></div>}
                        </div>
                      ) : <Val ar={ar}>{''}</Val>}
                    </td>

                    {/* Training Days */}
                    <td style={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
                      <Val ar={ar}>{days}</Val>
                    </td>

                    {/* Time */}
                    <td style={{ fontSize: '0.78rem' }}>
                      {s.attendance_start || s.attendance_end ? (
                        <div>
                          {s.attendance_start && <div style={{ color: 'var(--text-muted)' }}>{ar ? 'من: ' : 'From: '}<b>{fmtTime(s.attendance_start)}</b></div>}
                          {s.attendance_end   && <div style={{ color: 'var(--text-muted)' }}>{ar ? 'إلى: ' : 'To: '}<b>{fmtTime(s.attendance_end)}</b></div>}
                        </div>
                      ) : <Val ar={ar}>{''}</Val>}
                    </td>

                    {/* GPS */}
                    <td style={{ fontSize: '0.75rem' }}>
                      {s.latitude && s.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                          target="_blank" rel="noreferrer"
                          style={{ color: 'var(--accent)', wordBreak: 'break-all' }}
                        >
                          📍 {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}
                        </a>
                      ) : <Val ar={ar}>{''}</Val>}
                    </td>

                    {/* Missing badges */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                        {missing.map(f => <Missing key={f} label={f} />)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 14 }}>
          {ar ? `إجمالي: ${filtered.length} طالب` : `Total: ${filtered.length} student(s)`}
        </p>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 13, height: 13,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
    }} />
  );
}
