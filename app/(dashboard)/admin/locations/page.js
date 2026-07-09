'use client';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTranslation } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabaseClient';

export default function AdminLocations() {
  const { locale, t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', city: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'selected' | 'unselected'

  // ── Merge modal state ────────────────────────────────────────
  const [mergeSource, setMergeSource] = useState(null);  // location to be removed (duplicate)
  const [mergeTargetId, setMergeTargetId] = useState(''); // the canonical location to keep
  const [merging, setMerging] = useState(false);

  const load = async () => {
    try {
      const data = await api.locations.list();
      const locList = data.locations || [];

      // Fetch student selections count
      const { data: studentLocs, error: studentError } = await supabase
        .from('students')
        .select('location_id');

      if (studentError) throw studentError;

      const counts = {};
      (studentLocs || []).forEach((s) => {
        if (s.location_id) {
          counts[s.location_id] = (counts[s.location_id] || 0) + 1;
        }
      });

      const mapped = locList.map((l) => ({
        ...l,
        studentCount: counts[l._id] || 0,
      }));

      setLocations(mapped);
    }
    catch (err) {
      console.error('Error loading locations:', err);
    }
    finally { setLoading(false); }
  };

  const sortedLocations = useMemo(() => {
    let filtered = [...locations];
    if (filterType === 'selected') {
      filtered = filtered.filter(l => l.studentCount > 0);
    } else if (filterType === 'unselected') {
      filtered = filtered.filter(l => l.studentCount === 0);
    }
    return filtered.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', locale === 'ar' ? 'ar' : 'en', { sensitivity: 'accent' })
    );
  }, [locations, locale, filterType]);

  useEffect(() => {
    Promise.resolve().then(() => {
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', city: '', region: '' });
    setModal(true);
  };

  const openEdit = (loc) => {
    setEditItem(loc);
    setForm({ name: loc.name, city: loc.city, region: '' });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.locations.update(editItem._id, form);
        toast.success(locale === 'ar' ? 'تم تحديث الموقع بنجاح' : 'Location updated');
      } else {
        await api.locations.create(form);
        toast.success(locale === 'ar' ? 'تم إضافة الموقع بنجاح' : 'Location added');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(locale === 'ar' ? `هل تريد حذف "${name}"؟` : `Delete "${name}"?`)) return;
    try {
      await api.locations.delete(id);
      toast.success(locale === 'ar' ? 'تم حذف الموقع بنجاح' : 'Location deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Merge: open modal with the duplicate source selected ──────
  const openMerge = (loc) => {
    setMergeSource(loc);
    setMergeTargetId('');
  };

  // ── Merge: reassign students from source → target, then deactivate source ──
  const handleMerge = async () => {
    if (!mergeTargetId) return;
    if (mergeTargetId === mergeSource._id) {
      toast.error(locale === 'ar' ? 'لا يمكن دمج الموقع مع نفسه' : 'Cannot merge a location with itself');
      return;
    }

    const targetLoc = locations.find(l => l._id === mergeTargetId);
    const confirmMsg = locale === 'ar'
      ? `سيتم نقل ${mergeSource.studentCount} طالب من "${mergeSource.name}" إلى "${targetLoc?.name}" ثم حذف الموقع المكرر نهائياً. هل أنت متأكد؟`
      : `Move ${mergeSource.studentCount} student(s) from "${mergeSource.name}" to "${targetLoc?.name}" and permanently delete the duplicate. Confirm?`;

    if (!confirm(confirmMsg)) return;

    setMerging(true);
    try {
      // Step 1 – reassign all students pointing to the duplicate to the target
      const { error: reassignError } = await supabase
        .from('students')
        .update({ location_id: mergeTargetId })
        .eq('location_id', mergeSource._id);

      if (reassignError) throw reassignError;

      // Step 2 – hard-delete the duplicate location
      const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('id', mergeSource._id);

      if (deleteError) throw deleteError;

      toast.success(locale === 'ar'
        ? '✅ تم الدمج بنجاح! جميع الطلاب انتقلوا إلى الموقع الجديد.'
        : '✅ Merge successful! All students moved to the target location.');

      setMergeSource(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div>
      <div className="page-header flex-between" style={{flexWrap:'wrap',gap:12}}>
        <div>
          <h1>{t('sideLocations')}</h1>
          <p className="text-muted">
            {locale === 'ar' ? 'إدارة مواقع صيدليات التدريب' : 'Manage training pharmacy locations'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select
            className="form-control"
            style={{ width: 180 }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">{locale === 'ar' ? 'جميع المواقع' : 'All Locations'}</option>
            <option value="selected">{locale === 'ar' ? 'المواقع المختارة' : 'Selected Locations'}</option>
            <option value="unselected">{locale === 'ar' ? 'المواقع غير المختارة' : 'Unselected'}</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            + {t('addLocation')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{height:200}}><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper card" style={{padding:0}}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>#</th>
                <th style={{ width: '180px', textAlign: 'center' }}>{t('cityLabel')}</th>
                <th style={{ textAlign: 'center' }}>{locale === 'ar' ? 'اسم الصيدلية' : 'Pharmacy Name'}</th>
                <th style={{ width: '150px', textAlign: 'center' }}>{locale === 'ar' ? 'عدد الطلبة' : 'Students'}</th>
                <th style={{ width: '220px', textAlign: 'left', paddingLeft: '24px' }}>{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedLocations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>
                    {locale === 'ar' ? 'لا توجد مواقع بعد.' : 'No locations yet.'}
                  </td>
                </tr>
              ) : (
                sortedLocations.map((l, i) => (
                  <tr key={l._id}>
                    <td className="text-muted" style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ textAlign: 'center' }}>{l.city}</td>
                    <td style={{fontWeight:600, textAlign: 'center'}}>{l.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={l.studentCount > 0 ? "badge badge-success" : "badge"} style={{ opacity: l.studentCount > 0 ? 1 : 0.6 }}>
                        {l.studentCount}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'left', paddingLeft: '24px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)} style={{ marginRight: 4, marginLeft: 4 }}>
                        ✏️ {locale === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openMerge(l)}
                        style={{ marginRight: 4, marginLeft: 4, borderColor: '#6366f1', color: '#6366f1' }}
                        title={locale === 'ar' ? 'دمج مع موقع آخر' : 'Merge into another location'}
                      >
                        🔀 {locale === 'ar' ? 'دمج' : 'Merge'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l._id, l.name)} style={{ marginRight: 4, marginLeft: 4 }}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editItem ? t('editLocation') : t('addLocation')}</h4>
              <button onClick={() => setModal(false)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'block' }}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>
                    {t('cityLabel')} *
                  </label>
                  <input
                    className="form-control"
                    placeholder={locale === 'ar' ? 'مثال: الموصل' : 'e.g. Mosul'}
                    value={form.city}
                    onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>
                    {locale === 'ar' ? 'اسم الصيدلية' : 'Pharmacy Name'} *
                  </label>
                  <input
                    className="form-control"
                    placeholder={locale === 'ar' ? 'مثال: صيدلية النور' : 'e.g. Al-Zuhour'}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : editItem ? (locale === 'ar' ? 'تعديل' : 'Update') : t('addLocation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Merge Modal ── */}
      {mergeSource && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => !merging && setMergeSource(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h4>🔀 {locale === 'ar' ? 'دمج الموقع المكرر' : 'Merge Duplicate Location'}</h4>
              <button onClick={() => setMergeSource(null)} className="btn btn-icon btn-secondary" disabled={merging}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'block' }}>

              {/* Source info */}
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {locale === 'ar' ? '🗑️ الموقع المكرر (سيُحذف)' : '🗑️ Duplicate to remove'}
                </p>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {mergeSource.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {mergeSource.city} · {locale === 'ar' ? `${mergeSource.studentCount} طالب` : `${mergeSource.studentCount} student(s)`}
                </p>
              </div>

              <p style={{ textAlign: 'center', margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>⬇️</p>

              {/* Target selector */}
              <div style={{ marginBottom: 6 }}>
                <label className="form-label" style={{ color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  {locale === 'ar' ? '✅ اختر الموقع الصحيح (سيتم الاحتفاظ به)' : '✅ Select the correct location to keep'}
                </label>
                <select
                  className="form-control"
                  value={mergeTargetId}
                  onChange={e => setMergeTargetId(e.target.value)}
                >
                  <option value="">{locale === 'ar' ? '— اختر الموقع —' : '— Select location —'}</option>
                  {locations
                    .filter(l => l._id !== mergeSource._id)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', locale === 'ar' ? 'ar' : 'en'))
                    .map(l => (
                      <option key={l._id} value={l._id}>
                        {l.name} — {l.city} ({l.studentCount} {locale === 'ar' ? 'طالب' : 'students'})
                      </option>
                    ))
                  }
                </select>
              </div>

              {mergeTargetId && (
                <div style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                  fontSize: '0.85rem', color: 'var(--text-secondary)',
                }}>
                  {locale === 'ar'
                    ? `سيتم نقل ${mergeSource.studentCount} طالب إلى الموقع المختار، ثم يُلغى تفعيل الموقع المكرر تلقائياً.`
                    : `${mergeSource.studentCount} student(s) will be moved to the selected location, then the duplicate will be deactivated.`}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setMergeSource(null)} disabled={merging}>
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleMerge}
                disabled={!mergeTargetId || merging}
                style={{ background: mergeTargetId ? '#6366f1' : undefined }}
              >
                {merging
                  ? (locale === 'ar' ? '⏳ جاري الدمج...' : '⏳ Merging...')
                  : (locale === 'ar' ? '🔀 تأكيد الدمج' : '🔀 Confirm Merge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
