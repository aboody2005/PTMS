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
   Mobile Card
   ───────────────────────────────────────── */
function StudentCard({ s, idx, ar }) {
  const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;

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
      </div>

      {/* Details block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Pharmacy / Location */}
        <div style={{
          padding: '10px 12px',
          background: 'var(--surface-alt, rgba(0,0,0,0.03))',
          borderRadius: 8,
          fontSize: '0.82rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-primary)' }}>
            <span>🏥</span>
            <span>{s.pharmacy_name || (ar ? 'غير محدد' : 'Not set')}</span>
          </div>
        </div>

        {/* Note Box */}
        <div style={{
          padding: '12px',
          background: 'var(--accent-dim, rgba(0,210,196,0.08))',
          borderInlineStart: '4px solid var(--accent)',
          borderRadius: '0 8px 8px 0',
          fontSize: '0.85rem',
          lineHeight: '1.4',
        }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent)' }}>
            {ar ? 'ملاحظة الطالب حول تغيير الصيدلية:' : 'Student Pharmacy Note:'}
          </p>
          <div style={{ color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {s.pharmacy_notes}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════ */
export default function StudentNotesPage() {
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

      // Filter only students who entered notes
      const withNotes = (data || []).filter(s => s.pharmacy_notes && s.pharmacy_notes.trim().length > 0);
      setStudents(withNotes);
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
      return p?.name?.toLowerCase().includes(q) ||
             p?.email?.toLowerCase().includes(q) ||
             p?.phone?.includes(q) ||
             s.pharmacy_name?.toLowerCase().includes(q) ||
             s.pharmacy_notes?.toLowerCase().includes(q);
    });
  }, [students, search]);

  /* ── Excel Export ── */
  const handleExport = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      const headers = ar
        ? ['#', 'اسم الطالب', 'البريد الإلكتروني', 'الهاتف', 'اسم الصيدلية', 'الملاحظات']
        : ['#', 'Student Name', 'Email', 'Phone', 'Pharmacy Name', 'Notes'];

      const rows = filtered.map((s, i) => {
        const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return [
          i + 1,
          p?.name || '',
          p?.email || '',
          p?.phone || '',
          s.pharmacy_name || '',
          s.pharmacy_notes || ''
        ];
      });

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Set column widths in Excel
      ws['!cols'] = [4, 25, 25, 14, 25, 50].map(w => ({ wch: w }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, ar ? 'الملاحظات' : 'Notes');

      XLSX.writeFile(wb, `student_pharmacy_notes_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
              background: 'var(--accent-dim, rgba(0,210,196,0.12))', color: 'var(--accent)',
              width: 42, height: 42, borderRadius: 10,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0,
            }}>📝</span>
            {ar ? 'ملاحظات الطلاب حول تغيير الصيدلية' : 'Student Pharmacy Notes'}
          </h1>
          <p className="text-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>
            {ar
              ? 'الطلاب الذين أضافوا ملاحظات حول رغبتهم في تغيير صيدلية التدريب'
              : 'Students who added notes about changing their training pharmacy'}
          </p>
        </div>
      </div>

      {/* Banner */}
      {!loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '12px 18px', borderRadius: 10, marginBottom: 18,
          background: students.length > 0 ? 'var(--accent-dim, rgba(0,210,196,0.08))' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${students.length > 0 ? 'var(--accent, #00d2c4)' : 'rgba(34,197,94,0.22)'}`,
        }}>
          <span style={{ fontSize: '1.5rem' }}>{students.length > 0 ? '📝' : '✅'}</span>
          <span style={{ fontWeight: 700, color: students.length > 0 ? 'var(--accent)' : '#22c55e', fontSize: '0.95rem' }}>
            {students.length > 0
              ? (ar ? `${students.length} طالب قاموا بإضافة ملاحظات` : `${students.length} student(s) added pharmacy change notes`)
              : (ar ? 'لا توجد ملاحظات مضافة حتى الآن.' : 'No notes added yet.')}
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
            placeholder={ar ? 'بحث باسم الطالب أو الصيدلية أو الملاحظة...' : 'Search by name, pharmacy or notes...'}
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
          <span style={{ fontSize: '2.5rem' }}>{search ? '🔍' : '📝'}</span>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {search
              ? (ar ? 'لا توجد نتائج' : 'No results found')
              : (ar ? 'لا يوجد طلبة قاموا بكتابة ملاحظات حتى الآن.' : 'No students have written notes yet.')}
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
          <table style={{ tableLayout: 'fixed', width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 42 }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '40%' }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  '#',
                  ar ? 'اسم الطالب' : 'Student Name',
                  ar ? 'البريد / الهاتف' : 'Email / Phone',
                  ar ? 'اسم الصيدلية' : 'Pharmacy Name',
                  ar ? 'الملاحظة' : 'Pharmacy Change Notes',
                ].map(h => <th key={h} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;

                return (
                  <tr key={s.id} style={{ verticalAlign: 'top' }}>
                    {/* # */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>

                    {/* Name */}
                    <td style={{ fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      {p?.name || '—'}
                    </td>

                    {/* Email / Phone */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', whiteSpace: 'normal' }}>
                      <div>{p?.email || '—'}</div>
                      {p?.phone && <div style={{ marginTop: 2 }}>{p.phone}</div>}
                    </td>

                    {/* Pharmacy */}
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{s.pharmacy_name || '—'}</span>
                    </td>

                    {/* Pharmacy Notes Callout */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{
                        padding: '10px 12px',
                        background: 'var(--accent-dim, rgba(0,210,196,0.06))',
                        borderInlineStart: '4px solid var(--accent)',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '0.82rem',
                        lineHeight: '1.4',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        color: 'var(--text-primary)',
                      }}>
                        {s.pharmacy_notes}
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
