'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

/* ─────────────────────────────────────────────
   CSV / Excel simple parser (client-side)
   Handles .csv files and basic .xlsx text exports
───────────────────────────────────────────── */
function parseFileNames(text) {
  // Split by newlines, handle \r\n and \n
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const names = [];
  for (const line of lines) {
    // Try comma separation first; if a line has no comma, treat it as a single name
    const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
    // Use the longest non-numeric column as the name
    const best = cols
      .filter((c) => c && isNaN(Number(c)))
      .sort((a, b) => b.length - a.length)[0];
    if (best) names.push(best);
  }
  return names;
}

/* ─────────────────────────────────────────────
   Progress Bar component
───────────────────────────────────────────── */
function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      background: 'var(--border)',
      borderRadius: 99,
      height: 10,
      overflow: 'hidden',
      width: '100%',
      marginTop: 8,
    }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          borderRadius: 99,
          transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Status dot
───────────────────────────────────────────── */
function StatusDot({ registered }) {
  return (
    <span
      title={registered ? 'مسجّل' : 'غير مسجّل'}
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: registered ? '#22c55e' : 'var(--text-muted)',
        boxShadow: registered ? '0 0 6px #22c55e88' : 'none',
        transition: 'background 0.3s, box-shadow 0.3s',
        flexShrink: 0,
        marginTop: 2,
      }}
    />
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function StudentDataPage() {
  const { locale } = useTranslation();
  const ar = locale === 'ar';
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── State ── */
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'registered' | 'not'
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'status_reg' | 'status_not'
  const [selected, setSelected] = useState(new Set());

  /* ── Modals ── */
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null); // student object
  const [deleteModal, setDeleteModal] = useState(null); // student object
  const [importModal, setImportModal] = useState(false);

  /* ── Form state ── */
  const [addName, setAddName] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* ── Import state ── */
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  /* ── Sync state ── */
  const [syncing, setSyncing] = useState(false);

  /* ──────────────────────────────────────────
     Load + auto-sync on mount
  ─────────────────────────────────────────── */
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/official-students');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudents(data.students || []);
    } catch (err) {
      if (!silent) toast.error(ar ? 'فشل تحميل بيانات الطلبة' : 'Failed to load student data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ar]);

  // Auto-sync on mount: fetch list first, then silently sync registration
  // status in the background and refresh the list once done.
  useEffect(() => {
    const init = async () => {
      await load();
      try {
        await fetch('/api/official-students/sync');
        // Reload silently so the UI updates without a visible spinner
        await load({ silent: true });
      } catch {
        // Non-fatal — sync failure should never block the page
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ──────────────────────────────────────────
     Derived data
  ─────────────────────────────────────────── */
  const totalCount = students.length;
  const registeredCount = students.filter((s) => s.is_registered).length;
  const remainingCount = totalCount - registeredCount;
  const percentage = totalCount > 0 ? Math.round((registeredCount / totalCount) * 100) : 0;

  const filtered = students
    .filter((s) => {
      const matchSearch =
        !search || s.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === 'all'
          ? true
          : filter === 'registered'
          ? s.is_registered
          : !s.is_registered;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'ar');
      if (sortBy === 'status_reg') return (b.is_registered ? 1 : 0) - (a.is_registered ? 1 : 0);
      if (sortBy === 'status_not') return (a.is_registered ? 1 : 0) - (b.is_registered ? 1 : 0);
      return 0;
    });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  /* ──────────────────────────────────────────
     Handlers
  ─────────────────────────────────────────── */
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  /* Add — supports multiple names, one per line */
  const handleAdd = async (e) => {
    e.preventDefault();
    const names = addName
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return toast.error(ar ? 'أدخل اسماً واحداً على الأقل' : 'Enter at least one name');
    setSaving(true);
    try {
      if (names.length === 1) {
        // Single name — use the regular endpoint
        const res = await fetch('/api/official-students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: names[0] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success(ar ? 'تمت الإضافة بنجاح' : 'Student added');
      } else {
        // Multiple names — use the bulk import endpoint
        const res = await fetch('/api/official-students/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const skippedMsg = data.skipped > 0
          ? (ar ? ` (${data.skipped} مكرر تم تجاهله)` : ` (${data.skipped} duplicates skipped)`)
          : '';
        toast.success(
          ar
            ? `تمت إضافة ${data.inserted} طالب${skippedMsg}`
            : `Added ${data.inserted} students${skippedMsg}`
        );
      }
      setAddModal(false);
      setAddName('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* Edit */
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return toast.error(ar ? 'الاسم مطلوب' : 'Name is required');
    setSaving(true);
    try {
      const res = await fetch(`/api/official-students/${editModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(ar ? 'تم التعديل' : 'Updated');
      setEditModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* Delete single */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/official-students/${deleteModal.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(ar ? 'تم الحذف' : 'Deleted');
      setDeleteModal(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteModal.id);
        return next;
      });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* Bulk delete */
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/official-students/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(ar ? `تم حذف ${selected.size} طالب` : `Deleted ${selected.size} students`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  /* Sync All — repair stale is_registered flags */
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/official-students/sync');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const msg = ar
        ? `تم تحديث ${data.updated} طالب وتصحيح ${data.cleared} إدخال`
        : `Updated ${data.updated} student(s), cleared ${data.cleared} stale record(s)`;
      toast.success(msg);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  /* Export CSV */
  const handleExport = () => {
    const rows = [
      ar ? ['الاسم', 'الحالة', 'تاريخ التسجيل'] : ['Name', 'Status', 'Registered At'],
      ...students.map((s) => [
        s.name,
        s.is_registered ? (ar ? 'مسجّل' : 'Registered') : (ar ? 'غير مسجّل' : 'Not Registered'),
        s.registered_at ? format(new Date(s.registered_at), 'dd/MM/yyyy HH:mm') : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'official_students.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* File picker for import */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const names = parseFileNames(text);
      setImportPreview(names);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/official-students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: importPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const skippedMsg = data.skipped > 0
        ? (ar ? ` (${data.skipped} مكرر تم تجاهله)` : ` (${data.skipped} duplicates skipped)`)
        : '';
      toast.success(
        ar
          ? `تم استيراد ${data.inserted} طالب${skippedMsg}`
          : `Imported ${data.inserted} students${skippedMsg}`
      );
      setImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  /* ──────────────────────────────────────────
     Render
  ─────────────────────────────────────────── */
  return (
    <div style={{ direction: ar ? 'rtl' : 'ltr' }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              width: 40, height: 40, borderRadius: 10,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0,
            }}>🎓</span>
            {ar ? 'بيانات الطلبة' : 'Student Data'}
          </h1>
          <p className="text-muted">
            {ar
              ? 'القائمة الرسمية للطلبة ومقارنتها بالمسجلين على المنصة'
              : 'Official student roster compared against registered website users'}
          </p>
        </div>
      </div>

      {/* ── Statistics ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 14,
        marginBottom: 24,
      }}>
        {[
          {
            icon: '👥',
            label: ar ? 'إجمالي الطلبة' : 'Total Students',
            value: totalCount,
            color: 'var(--accent)',
            bg: 'var(--accent-dim)',
            active: filter === 'all',
            onClick: () => setFilter('all'),
          },
          {
            icon: '🟢',
            label: ar ? 'المسجّلون' : 'Registered',
            value: registeredCount,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.12)',
            active: filter === 'registered',
            onClick: () => setFilter('registered'),
          },
          {
            icon: '⚪',
            label: ar ? 'غير مسجّلين' : 'Not Registered',
            value: remainingCount,
            color: 'var(--text-muted)',
            bg: 'var(--border)',
            active: filter === 'not',
            onClick: () => setFilter('not'),
          },
          {
            icon: '📊',
            label: ar ? 'نسبة التسجيل' : 'Registration %',
            value: `${percentage}%`,
            color: percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#f59e0b' : '#ef4444',
            bg: percentage >= 80
              ? 'rgba(34,197,94,0.12)'
              : percentage >= 50
              ? 'rgba(245,158,11,0.12)'
              : 'rgba(239,68,68,0.12)',
            onClick: null,
            active: false,
          },
        ].map(({ icon, label, value, color, bg, active, onClick }) => (
          <div
            key={label}
            className="stat-card"
            onClick={onClick || undefined}
            style={{
              cursor: onClick ? 'pointer' : 'default',
              outline: active ? `2px solid ${color}` : '2px solid transparent',
              transition: 'outline 0.15s',
            }}
          >
            <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="stat-info">
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
              <h3 style={{ margin: 0, color }}>{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {ar ? 'نسبة التسجيل' : 'Registration Progress'}
          </span>
          <span style={{
            fontSize: '0.85rem', fontWeight: 700,
            color: percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#f59e0b' : '#ef4444',
          }}>
            {registeredCount} / {totalCount} — {percentage}%
          </span>
        </div>
        <ProgressBar value={percentage} />
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div className="search-bar" style={{ flex: '1 1 220px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder={ar ? 'بحث بالاسم...' : 'Search by name...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingInlineStart: 36 }}
          />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: ar ? 'الكل' : 'All' },
            { key: 'registered', label: ar ? 'مسجّل' : 'Registered' },
            { key: 'not', label: ar ? 'غير مسجّل' : 'Not Registered' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: filter === key ? 'none' : '1px solid var(--border)',
                background: filter === key ? 'var(--accent)' : 'var(--surface)',
                color: filter === key ? '#fff' : 'var(--text-secondary)',
                fontWeight: filter === key ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.82rem',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          className="form-control"
          style={{ width: 180 }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name_asc">{ar ? 'الاسم: أ — ي' : 'Name: A — Z'}</option>
          <option value="name_desc">{ar ? 'الاسم: ي — أ' : 'Name: Z — A'}</option>
          <option value="status_reg">{ar ? 'المسجّلون أولاً' : 'Registered First'}</option>
          <option value="status_not">{ar ? 'غير المسجّلين أولاً' : 'Not Registered First'}</option>
        </select>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginInlineStart: 'auto', flexWrap: 'wrap' }}>
          {selected.size > 0 && (
            <button
              className="btn btn-sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              🗑 {ar ? `حذف ${selected.size} محدد` : `Delete ${selected.size} selected`}
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSyncAll}
            disabled={syncing}
            title={ar ? 'مزامنة حالة التسجيل مع قاعدة البيانات' : 'Re-sync registration status from database'}
          >
            {syncing ? '⏳' : '🔄'} {ar ? 'مزامنة الكل' : 'Sync All'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            ⬇ {ar ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setImportModal(true); setImportPreview([]); setImportFile(null); }}>
            ⬆ {ar ? 'استيراد' : 'Import'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setAddModal(true); setAddName(''); }}
          >
            + {ar ? 'إضافة طالب' : 'Add Student'}
          </button>
        </div>
      </div>

      {/* ── Student List ── */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* List header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 8 : 12,
            padding: isMobile ? '10px 12px' : '12px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-alt, rgba(0,0,0,0.05))',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              title={ar ? 'تحديد الكل' : 'Select all'}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>{ar ? 'الطالب' : 'Student'}</span>
            {!isMobile && <span style={{ width: 160, textAlign: 'center' }}>{ar ? 'الحالة' : 'Status'}</span>}
            <span style={{ width: isMobile ? 72 : 100, textAlign: 'center' }}>{ar ? 'إجراءات' : 'Actions'}</span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
              <p style={{ margin: 0 }}>
                {ar ? 'لا توجد نتائج مطابقة للبحث أو الفلتر.' : 'No matching results.'}
              </p>
            </div>
          ) : (
            filtered.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 8 : 12,
                  padding: isMobile ? '10px 12px' : '12px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  background: selected.has(s.id) ? 'var(--accent-dim)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleSelect(s.id)}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                />

                {/* Avatar + Name + mobile status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  {/* Avatar with status dot on mobile */}
                  <div style={{
                    width: isMobile ? 32 : 36,
                    height: isMobile ? 32 : 36,
                    borderRadius: 8,
                    background: s.is_registered ? 'rgba(34,197,94,0.12)' : 'var(--border)',
                    color: s.is_registered ? '#22c55e' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                    position: 'relative',
                  }}>
                    {s.name.charAt(0)}
                    {isMobile && (
                      <span style={{
                        position: 'absolute',
                        bottom: -2, right: -2,
                        width: 9, height: 9,
                        borderRadius: '50%',
                        background: s.is_registered ? '#22c55e' : 'var(--text-muted)',
                        boxShadow: s.is_registered ? '0 0 5px #22c55e88' : 'none',
                        border: '1.5px solid var(--surface)',
                      }} />
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: isMobile ? '0.82rem' : '0.875rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {s.name}
                    </p>
                    {isMobile ? (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: s.is_registered ? '#22c55e' : 'var(--text-muted)',
                        display: 'block',
                        marginTop: 1,
                      }}>
                        {s.is_registered ? (ar ? 'مسجّل ✓' : 'Registered ✓') : (ar ? 'غير مسجّل' : 'Not Registered')}
                      </span>
                    ) : (
                      s.registered_at && (
                        <span className="text-muted" style={{ fontSize: '0.72rem', display: 'block' }}>
                          {ar ? 'تسجيل: ' : 'Registered: '}{format(new Date(s.registered_at), 'dd/MM/yyyy')}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Status column — desktop only */}
                {!isMobile && (
                  <div style={{ width: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <StatusDot registered={s.is_registered} />
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: s.is_registered ? '#22c55e' : 'var(--text-muted)',
                      transition: 'color 0.3s',
                    }}>
                      {s.is_registered
                        ? (ar ? 'مسجّل ✓' : 'Registered ✓')
                        : (ar ? 'غير مسجّل' : 'Not Registered')}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ width: isMobile ? 72 : 100, display: 'flex', gap: isMobile ? 4 : 6, justifyContent: 'center', flexShrink: 0 }}>
                  <button
                    className="btn btn-icon btn-secondary"
                    title={ar ? 'تعديل' : 'Edit'}
                    onClick={() => { setEditModal(s); setEditName(s.name); }}
                    style={{ padding: isMobile ? '5px 7px' : '4px 8px', fontSize: '0.85rem' }}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-icon btn-secondary"
                    title={ar ? 'حذف' : 'Delete'}
                    onClick={() => setDeleteModal(s)}
                    style={{ padding: isMobile ? '5px 7px' : '4px 8px', fontSize: '0.85rem', color: '#ef4444' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Footer count */}
          {filtered.length > 0 && (
            <div style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>
                {ar
                  ? `عرض ${filtered.length} من ${totalCount} طالب`
                  : `Showing ${filtered.length} of ${totalCount} students`}
              </span>
              {selected.size > 0 && (
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {ar ? `${selected.size} محدد` : `${selected.size} selected`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════
          MODAL: Add Student
      ═══════════════════════════════════ */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h4 style={{ margin: 0 }}>🎓 {ar ? 'إضافة طلبة' : 'Add Students'}</h4>
              <button className="btn btn-icon btn-secondary" onClick={() => setAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body" style={{ display: 'block' }}>

                {/* Hint banner */}
                <div style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                }}>
                  {ar ? (
                    <>
                      📋 <strong>يمكنك إضافة طالب واحد أو عدة طلاب دفعة واحدة.</strong><br />
                      — اكتب كل اسم في سطر منفصل.<br />
                      — يجب أن يتطابق الاسم بالضبط مع ما سيكتبه الطالب لحظة التسجيل.<br />
                      — سيتم تجاهل الأسماء المكررة تلقائياً.
                    </>
                  ) : (
                    <>
                      📋 <strong>You can add one or many students at once.</strong><br />
                      — Write each name on a separate line.<br />
                      — Names must match exactly what students type during registration.<br />
                      — Duplicate names are automatically skipped.
                    </>
                  )}
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      {ar ? 'أسماء الطلبة' : 'Student Names'} *
                    </label>
                    {/* Live counter */}
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      background: 'var(--border)',
                      borderRadius: 20,
                      padding: '2px 10px',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {addName.split('\n').map(n => n.trim()).filter(Boolean).length}
                      {ar ? ' اسم' : ' name(s)'}
                    </span>
                  </div>

                  <textarea
                    className="form-control"
                    placeholder={
                      ar
                        ? 'أحمد علي محمد\nسارة خالد حسن\nمحمد عمر يوسف\n...'
                        : 'Ahmed Ali Mohamed\nSara Khalid Hassan\nMohamed Omar Youssef\n...'
                    }
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    autoFocus
                    rows={10}
                    style={{
                      resize: 'vertical',
                      minHeight: 220,
                      fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
                      fontSize: '0.9rem',
                      lineHeight: 1.8,
                      direction: 'rtl',
                      textAlign: ar ? 'right' : 'left',
                    }}
                  />
                </div>

                {/* Preview chips */}
                {addName.split('\n').map(n => n.trim()).filter(Boolean).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                      {ar ? 'معاينة:' : 'Preview:'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {addName.split('\n').map(n => n.trim()).filter(Boolean).map((name, i) => (
                        <span key={i} style={{
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)',
                          borderRadius: 20,
                          padding: '2px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                        }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setAddModal(false); setAddName(''); }}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || addName.split('\n').map(n => n.trim()).filter(Boolean).length === 0}
                >
                  {saving
                    ? (ar ? 'جاري الإضافة...' : 'Adding...')
                    : ar
                      ? `إضافة ${addName.split('\n').map(n => n.trim()).filter(Boolean).length || ''} طالب`
                      : `Add ${addName.split('\n').map(n => n.trim()).filter(Boolean).length || ''} Student(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          MODAL: Edit Student
      ═══════════════════════════════════ */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h4 style={{ margin: 0 }}>✏️ {ar ? 'تعديل بيانات الطالب' : 'Edit Student'}</h4>
              <button className="btn btn-icon btn-secondary" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body" style={{ display: 'block' }}>
                <div className="form-group">
                  <label className="form-label">{ar ? 'الاسم الكامل' : 'Full Name'} *</label>
                  <input
                    className="form-control"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          MODAL: Delete Confirmation
      ═══════════════════════════════════ */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h4 style={{ margin: 0, color: '#ef4444' }}>🗑 {ar ? 'تأكيد الحذف' : 'Confirm Delete'}</h4>
              <button className="btn btn-icon btn-secondary" onClick={() => setDeleteModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'block' }}>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                {ar
                  ? <>هل أنت متأكد من حذف الطالب <strong>"{deleteModal.name}"</strong>؟ لا يمكن التراجع عن هذه العملية.</>
                  : <>Are you sure you want to delete <strong>"{deleteModal.name}"</strong>? This action cannot be undone.</>}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {deleting ? (ar ? 'جاري الحذف...' : 'Deleting...') : (ar ? 'حذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          MODAL: Import CSV / Excel
      ═══════════════════════════════════ */}
      {importModal && (
        <div className="modal-overlay" onClick={() => setImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h4 style={{ margin: 0 }}>⬆ {ar ? 'استيراد قائمة الطلبة' : 'Import Student List'}</h4>
              <button className="btn btn-icon btn-secondary" onClick={() => setImportModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'block' }}>
              {/* Instructions */}
              <div style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: 16,
                lineHeight: 1.7,
              }}>
                {ar ? (
                  <>
                    📋 <strong>تعليمات الاستيراد:</strong><br />
                    — ارفع ملف <strong>CSV</strong> يحتوي أعمدة الأسماء.<br />
                    — يجب أن تكون الأسماء مكتوبة بنفس الطريقة التي سيستخدمها الطلاب عند التسجيل.<br />
                    — سيتم تجاهل الأسماء المكررة تلقائياً.
                  </>
                ) : (
                  <>
                    📋 <strong>Import Instructions:</strong><br />
                    — Upload a <strong>CSV</strong> file with student names.<br />
                    — Names must match exactly how students will type them during registration.<br />
                    — Duplicates are automatically skipped.
                  </>
                )}
              </div>

              {/* File picker */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 10,
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  marginBottom: 16,
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📂</div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {importFile
                    ? importFile.name
                    : (ar ? 'انقر لاختيار ملف CSV' : 'Click to choose a CSV file')}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.85rem' }}>
                    {ar
                      ? `معاينة — ${importPreview.length} اسم`
                      : `Preview — ${importPreview.length} names`}
                  </p>
                  <div style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    {importPreview.map((name, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: '0.82rem', padding: '3px 0',
                        borderBottom: i < importPreview.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <span style={{ color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>{i + 1}.</span>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setImportModal(false)}>
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing || importPreview.length === 0}
              >
                {importing
                  ? (ar ? 'جاري الاستيراد...' : 'Importing...')
                  : (ar ? `استيراد ${importPreview.length} اسم` : `Import ${importPreview.length} names`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
