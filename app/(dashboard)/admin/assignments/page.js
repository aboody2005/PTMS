'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTranslation } from '@/context/LanguageContext';

export default function AdminAssignments() {
  const { locale, t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ startDate: '', endDate: '', status: '', teacherId: '', locationId: '' });
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [savedGlobalEndDate, setSavedGlobalEndDate] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [lockEdits, setLockEdits] = useState(false);
  const [updatingLock, setUpdatingLock] = useState(false);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    async function load() {
      try {
        const [sRes, tRes, lRes] = await Promise.all([
          api.students.list({ limit: 100 }),
          api.teachers.list(),
          api.locations.list(),
        ]);
        setStudents(sRes.students || []);
        setTeachers(tRes.teachers || []);
        setLocations(lRes.locations || []);
      } catch {}
      finally { setLoading(false); }

      // Separately fetch the saved global end date
      try {
        const gRes = await api.students.getGlobalEndDate();
        if (gRes.defaultTrainingEndDate) {
          const dateStr = gRes.defaultTrainingEndDate.split('T')[0];
          setBulkEndDate(dateStr);
          setSavedGlobalEndDate(dateStr);
        }
      } catch {}

      // Separately fetch the saved lock status
      try {
        const lockRes = await api.students.getLockStudentEdits();
        setLockEdits(lockRes.lockStudentEdits);
      } catch {}
    }
    load();
  }, []);

  const assign = async (studentId, teacherId) => {
    setSaving(studentId);
    try {
      await api.students.update(studentId, { teacherId: teacherId || null });
      toast.success(locale === 'ar' ? 'تم تعيين المشرف بنجاح!' : 'Teacher assigned successfully!');
      setStudents(prev => prev.map(s => s._id === studentId ? { ...s, teacherId: teachers.find(t => t._id === teacherId) } : s));
    } catch (err) { toast.error(err.message); }
    finally { setSaving(null); }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditForm({
      startDate: student.startDate ? student.startDate.split('T')[0] : '',
      endDate: student.endDate ? student.endDate.split('T')[0] : '',
      status: student.status || 'active',
      teacherId: student.teacherId?._id || student.teacherId || '',
      locationId: student.locationId?._id || student.locationId || '',
    });
  };

  const getEditTrainingMonthValue = () => {
    if (!editForm.startDate) return '';
    if (editForm.startDate.includes('-07-') || editForm.startDate.endsWith('-07-01')) return 'july';
    if (editForm.startDate.includes('-08-') || editForm.startDate.endsWith('-08-01')) return 'august';
    try {
      const date = new Date(editForm.startDate);
      const month = date.getMonth();
      if (month === 6) return 'july';
      if (month === 7) return 'august';
    } catch {}
    return '';
  };

  const handleEditTrainingMonthChange = (e) => {
    const val = e.target.value;
    const year = editForm.startDate ? new Date(editForm.startDate).getFullYear() : 2026;
    if (val === 'july') {
      setEditForm(p => ({
        ...p,
        startDate: `${year}-07-01`,
        endDate: `${year}-07-31`
      }));
    } else if (val === 'august') {
      setEditForm(p => ({
        ...p,
        startDate: `${year}-08-01`,
        endDate: `${year}-08-31`
      }));
    } else {
      setEditForm(p => ({
        ...p,
        startDate: '',
        endDate: ''
      }));
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(editingStudent._id);
    try {
      const payload = {
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
        status: editForm.status,
        teacherId: editForm.teacherId || null,
        locationId: editForm.locationId || null,
      };
      await api.students.update(editingStudent._id, payload);
      toast.success(locale === 'ar' ? 'تم تحديث بيانات الطالب بنجاح!' : 'Student updated successfully!');
      
      const sRes = await api.students.list({ limit: 100 });
      setStudents(sRes.students || []);
      setEditingStudent(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleBulkUpdateEndDate = async () => {
    if (!bulkEndDate) return;
    const confirmMsg = locale === 'ar'
      ? `هل أنت متأكد من تعيين تاريخ انتهاء التدريب إلى ${bulkEndDate} لجميع الطلاب؟`
      : `Are you sure you want to set the training end date to ${bulkEndDate} for all students?`;
    if (!window.confirm(confirmMsg)) return;

    setBulkUpdating(true);
    try {
      const res = await api.students.updateBulk({ endDate: bulkEndDate });
      // Update input to show the confirmed saved date from the server
      const confirmedDate = res?.defaultTrainingEndDate || bulkEndDate;
      const dateStr = confirmedDate.split('T')[0];
      setBulkEndDate(dateStr);
      setSavedGlobalEndDate(dateStr);

      toast.success(locale === 'ar'
        ? `✅ تم حفظ تاريخ الانتهاء وتحديثه لجميع الطلاب (${res?.modifiedCount || 0} طالب).`
        : `✅ End date saved and applied to all students (${res?.modifiedCount || 0} students).`
      );
      const sRes = await api.students.list({ limit: 100 });
      setStudents(sRes.students || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleToggleLock = async () => {
    setUpdatingLock(true);
    try {
      const targetState = !lockEdits;
      await api.students.setLockStudentEdits(targetState);
      setLockEdits(targetState);
      toast.success(
        locale === 'ar'
          ? (targetState ? '🔒 تم إيقاف تعديل بيانات الطلاب بنجاح!' : '🔓 تم السماح بتعديل بيانات الطلاب!')
          : (targetState ? '🔒 Student edits locked successfully!' : '🔓 Student edits allowed!')
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingLock(false);
    }
  };

  const getStudentMonth = (s) => {
    if (!s.startDate) return 'not_set';
    if (s.startDate.includes('-07-') || s.startDate.endsWith('-07-01')) return 'july';
    if (s.startDate.includes('-08-') || s.startDate.endsWith('-08-01')) return 'august';
    try {
      const date = new Date(s.startDate);
      const month = date.getMonth();
      if (month === 6) return 'july';
      if (month === 7) return 'august';
    } catch {}
    return 'other';
  };

  const filtered = students
    .filter(s => {
      const matchSearch = !search || s.userId?.name?.toLowerCase().includes(search.toLowerCase());
      const matchLocation = !locationFilter || s.locationId?._id === locationFilter;
      
      const sMonth = getStudentMonth(s);
      const matchMonth = !monthFilter || sMonth === monthFilter;
      
      const matchStatus = !statusFilter || s.status === statusFilter;
      
      return matchSearch && matchLocation && matchMonth && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'month') {
        const getMonthOrder = (s) => {
          const m = getStudentMonth(s);
          if (m === 'july') return 1;
          if (m === 'august') return 2;
          if (m === 'other') return 3;
          return 4; // 'not_set'
        };
        const orderA = getMonthOrder(a);
        const orderB = getMonthOrder(b);
        if (orderA !== orderB) return orderA - orderB;
      } else if (sortBy === 'status') {
        const statusOrder = { active: 1, completed: 2 };
        const orderA = statusOrder[a.status] || 3;
        const orderB = statusOrder[b.status] || 3;
        if (orderA !== orderB) return orderA - orderB;
      }
      return (a.userId?.name || '').localeCompare(b.userId?.name || '');
    });

  return (
    <div>
      <div className="page-header">
        <h1>{t('assignmentsTitle')}</h1>
        <p className="text-muted">
          {locale === 'ar' ? 'تعيين المعلمين المشرفين للطلاب ومتابعة تقدمهم' : 'Assign supervisor teachers to students'}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16, borderLeft: '3px solid var(--accent)' }}>
        <h4 style={{ marginBottom: 4 }}>🔒 {locale === 'ar' ? 'التحكم في تعديل البيانات للطلاب' : 'Student Edits Control'}</h4>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 14 }}>
          {locale === 'ar'
            ? 'إيقاف أو السماح للطلاب بتعديل الصيدلية، ساعات التواجد، التواريخ، وموقع الخريطة.'
            : 'Stop or allow students to edit their pharmacy, hours, dates, and map location.'}
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={handleToggleLock}
            disabled={updatingLock}
            style={{
              backgroundColor: lockEdits ? 'var(--green)' : 'var(--error)',
              color: '#ffffff',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              padding: '8px 16px',
            }}
          >
            {updatingLock
              ? (locale === 'ar' ? 'جاري التحديث...' : 'Updating...')
              : lockEdits
                ? (locale === 'ar' ? '🔓 السماح بالتعديل' : '🔓 Allow Editing')
                : (locale === 'ar' ? '🛑 ايقاف التعديل' : '🛑 Stop Editing')}
          </button>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: lockEdits ? 'var(--green)' : 'var(--error)' }}>
            {lockEdits
              ? (locale === 'ar' ? '❌ تعديل البيانات متوقف حالياً للطلاب' : '❌ Student edits are currently blocked')
              : (locale === 'ar' ? '✅ تعديل البيانات متاح حالياً للطلاب' : '✅ Student edits are currently allowed')}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 400, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder={locale === 'ar' ? 'البحث عن الطلاب...' : 'Search students...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 180 }}
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
        >
          <option value="">{t('allLocations')}</option>
          {locations.map(l => (
            <option key={l._id} value={l._id}>
              {l.region || l.name} — {l.city}
            </option>
          ))}
        </select>
        <select
          className="form-control"
          style={{ width: 180 }}
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
        >
          <option value="">{locale === 'ar' ? 'كل شهور التدريب' : 'All Training Months'}</option>
          <option value="july">{locale === 'ar' ? 'شهر السابع (يوليو)' : 'July'}</option>
          <option value="august">{locale === 'ar' ? 'شهر الثامن (أغسطس)' : 'August'}</option>
          <option value="not_set">{locale === 'ar' ? 'غير محدد' : 'Not Set'}</option>
        </select>
        <select
          className="form-control"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
          <option value="active">{locale === 'ar' ? 'تدريب نشط' : 'Active Training'}</option>
          <option value="completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
        </select>
        <select
          className="form-control"
          style={{ width: 180 }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="name">{locale === 'ar' ? 'ترتيب حسب: الاسم' : 'Sort by: Name'}</option>
          <option value="month">{locale === 'ar' ? 'ترتيب حسب: شهر التدريب' : 'Sort by: Month'}</option>
          <option value="status">{locale === 'ar' ? 'ترتيب حسب: الحالة' : 'Sort by: Status'}</option>
        </select>
      </div>

      {loading ? <div className="flex-center" style={{height:200}}><div className="spinner" /></div> : (
        <div className="table-wrapper card" style={{padding:0}}>
          <table>
            <thead>
              <tr>
                <th>{locale === 'ar' ? 'الطالب' : 'Student'}</th>
                <th>{t('universityLabel')}</th>
                <th>{locale === 'ar' ? 'الصيدلية' : 'Pharmacy'}</th>
                <th>{locale === 'ar' ? 'المشرف الأكاديمي الحالي' : 'Current Teacher'}</th>
                <th>{locale === 'ar' ? 'تعيين مشرف' : 'Assign Teacher'}</th>
                <th>{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={6} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>{locale === 'ar' ? 'لم يتم العثور على طلاب.' : 'No students found.'}</td></tr>
                : filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                        <span style={{fontWeight:600,fontSize:'0.875rem'}}>{s.userId?.name}</span>
                        <span className={`badge badge-${s.status === 'completed' ? 'completed' : 'active'}`} style={{fontSize:'10px', padding:'2px 6px'}}>
                          {s.status === 'completed' ? t('completedHours') : t('activeTraining')}
                        </span>
                      </div>
                      <p className="text-xs text-muted" style={{marginTop:2}}>{s.userId?.email}</p>
                      {s.startDate && (
                        <p className="text-xs text-muted" style={{marginTop:4, fontSize:'11px', display:'flex', alignItems:'center', gap:4}}>
                          📅 {s.startDate.includes('-07-') ? (locale === 'ar' ? 'شهر السابع' : 'July') : s.startDate.includes('-08-') ? (locale === 'ar' ? 'شهر الثامن' : 'August') : (locale === 'ar' ? 'غير محدد' : 'Not set')}
                        </p>
                      )}
                    </td>
                    <td className="text-sm">{s.university || '—'}</td>
                    <td className="text-sm">
                      {s.pharmacyName || '—'}
                      {s.locationId && (
                        <div className="text-xs text-muted" style={{marginTop:2}}>
                          📍 {s.locationId.region || s.locationId.name} — {s.locationId.city}
                        </div>
                      )}
                    </td>
                    <td>
                      {s.teacherId
                        ? <span className="badge badge-info">👨‍🏫 {s.teacherId?.name || s.teacherId}</span>
                        : <span className="text-muted text-sm">{locale === 'ar' ? 'غير معين' : 'Unassigned'}</span>
                      }
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{minWidth:200}}
                        value={s.teacherId?._id || s.teacherId || ''}
                        onChange={e => assign(s._id, e.target.value)}
                        disabled={saving === s._id}
                      >
                        <option value="">{locale === 'ar' ? '— إلغاء التعيين —' : '— Unassign —'}</option>
                        {teachers.map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                      {saving === s._id && (
                        <span className="text-xs text-muted" style={{marginLeft:8, marginRight:8}}>
                          {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(s)}>
                        ✏️ {locale === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {editingStudent && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setEditingStudent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h4>{locale === 'ar' ? 'تعديل بيانات تدريب الطالب' : 'Edit Student Training Info'}</h4>
              <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'block' }}>
                <p style={{ marginBottom: 16 }}>
                  <strong>{locale === 'ar' ? 'اسم الطالب:' : 'Student Name:'}</strong> {editingStudent.userId?.name}
                </p>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{locale === 'ar' ? 'شهر التدريب' : 'Month of Training'}</label>
                  <select
                    className="form-control"
                    value={getEditTrainingMonthValue()}
                    onChange={handleEditTrainingMonthChange}
                  >
                    <option value="">{locale === 'ar' ? 'اختر شهر التدريب...' : 'Select training month...'}</option>
                    <option value="july">{locale === 'ar' ? 'شهر السابع' : 'July'}</option>
                    <option value="august">{locale === 'ar' ? 'شهر الثامن' : 'August'}</option>
                  </select>
                </div>



                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{t('statusLabel')}</label>
                  <select className="form-control" value={editForm.status}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="active">{t('activeTraining')}</option>
                    <option value="completed">{t('completedHours')}</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{locale === 'ar' ? 'الصيدلية / الموقع' : 'Pharmacy / Location'}</label>
                  <select className="form-control" value={editForm.locationId}
                    onChange={e => setEditForm(p => ({ ...p, locationId: e.target.value }))}>
                    <option value="">{locale === 'ar' ? '— غير محدد —' : '— Select Location —'}</option>
                    {locations.map(l => (
                      <option key={l._id} value={l._id}>{l.region || l.name} — {l.city}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{t('roleTeacher')}</label>
                  <select className="form-control" value={editForm.teacherId}
                    onChange={e => setEditForm(p => ({ ...p, teacherId: e.target.value }))}>
                    <option value="">{locale === 'ar' ? '— غير معين —' : '— Unassigned —'}</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingStudent(null)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving === editingStudent._id}>
                  {saving === editingStudent._id ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : `💾 ${t('saveProfile')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
