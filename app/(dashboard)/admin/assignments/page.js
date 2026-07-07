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
  const [editForm, setEditForm] = useState({ startDate: '', endDate: '', status: '', teacherId: '', locationId: '', trainingDays: [] });
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
          api.students.list({ limit: 10000 }),
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
      trainingDays: Array.isArray(student.trainingDays) ? student.trainingDays : [],
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
        trainingDays: editForm.trainingDays,
      };
      await api.students.update(editingStudent._id, payload);
      toast.success(locale === 'ar' ? 'تم تحديث بيانات الطالب بنجاح!' : 'Student updated successfully!');
      
      const sRes = await api.students.list({ limit: 10000 });
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
      const sRes = await api.students.list({ limit: 10000 });
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

  // Safely extract the location ID regardless of whether locationId is
  // a populated object { _id, city, ... } or a raw UUID string or null.
  const getStudentLocationId = (s) => {
    if (!s.locationId) return '';
    if (typeof s.locationId === 'object') return String(s.locationId._id || '');
    return String(s.locationId);
  };

  // Safely extract the location display info (city / region) for the table
  const getLocationDisplay = (s) => {
    if (!s.locationId) return null;
    if (typeof s.locationId === 'object' && s.locationId._id) {
      return { city: s.locationId.city, region: s.locationId.region || s.locationId.name };
    }
    // locationId is a raw UUID — look it up in the loaded locations list
    const loc = locations.find(l => String(l._id) === String(s.locationId));
    if (loc) return { city: loc.city, region: loc.region || loc.name };
    return null;
  };

  const getStudentMonth = (s) => {
    if (!s.startDate) return 'not_set';
    try {
      const month = new Date(s.startDate).getMonth();
      if (month === 6) return 'july';
      if (month === 7) return 'august';
    } catch {}
    // Fallback string check
    if (s.startDate.includes('-07-')) return 'july';
    if (s.startDate.includes('-08-')) return 'august';
    return 'other';
  };

  // Safely extract teacher display name regardless of object vs string
  const getTeacherName = (s) => {
    if (!s.teacherId) return null;
    if (typeof s.teacherId === 'object') return s.teacherId.name || null;
    // raw UUID — look up in teachers list
    const teacher = teachers.find(t => String(t._id) === String(s.teacherId));
    return teacher?.name || null;
  };

  // Safely get the teacherId string for the <select> value
  const getTeacherIdValue = (s) => {
    if (!s.teacherId) return '';
    if (typeof s.teacherId === 'object') return String(s.teacherId._id || '');
    return String(s.teacherId);
  };

  const filtered = students
    .filter(s => {
      const matchSearch = !search ||
        s.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.userId?.email?.toLowerCase().includes(search.toLowerCase());

      // Compare location: check exact ID match or fall back to matching by city & name/region
      // to handle duplicate or deactivated locations gracefully.
      const filterLocId = String(locationFilter || '').trim();
      let matchLocation = !filterLocId;
      if (filterLocId) {
        const selectedLoc = locations.find(l => String(l._id) === filterLocId);
        if (selectedLoc) {
          const sLoc = getLocationDisplay(s);
          if (sLoc) {
            const sCity = String(sLoc.city || '').trim().toLowerCase();
            const sReg  = String(sLoc.region || '').trim().toLowerCase();
            const fCity = String(selectedLoc.city || '').trim().toLowerCase();
            const fReg  = String(selectedLoc.region || selectedLoc.name || '').trim().toLowerCase();
            if (sCity === fCity && sReg === fReg) {
              matchLocation = true;
            }
          }
        }
        if (!matchLocation) {
          const studentLocId = getStudentLocationId(s).trim();
          matchLocation = studentLocId === filterLocId;
        }
      }

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

      {/* ── Lock Control Card ── */}
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
              color: '#ffffff', fontWeight: 600,
              transition: 'all 0.3s ease', padding: '8px 16px',
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

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          {
            icon: '🎓', label: locale === 'ar' ? 'إجمالي الطلاب' : 'Total Students',
            value: students.length, color: 'var(--accent)', bg: 'var(--accent-dim)',
            active: !statusFilter && !monthFilter && !locationFilter,
            onClick: () => { setStatusFilter(''); setMonthFilter(''); setLocationFilter(''); },
          },
          {
            icon: '✅', label: locale === 'ar' ? 'تدريب نشط' : 'Active',
            value: students.filter(s => s.status !== 'completed').length,
            color: '#22c55e', bg: 'rgba(34,197,94,0.12)',
            active: statusFilter === 'active',
            onClick: () => setStatusFilter(statusFilter === 'active' ? '' : 'active'),
          },
          {
            icon: '🏁', label: locale === 'ar' ? 'مكتمل' : 'Completed',
            value: students.filter(s => s.status === 'completed').length,
            color: '#6366f1', bg: 'rgba(99,102,241,0.12)',
            active: statusFilter === 'completed',
            onClick: () => setStatusFilter(statusFilter === 'completed' ? '' : 'completed'),
          },
          {
            icon: '👨‍🏫', label: locale === 'ar' ? 'بدون مشرف' : 'Unassigned',
            value: students.filter(s => !s.teacherId).length,
            color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
            active: false, onClick: null,
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

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: '1 1 220px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder={locale === 'ar' ? 'البحث عن الطلاب...' : 'Search students...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingInlineStart: 36 }}
          />
        </div>
        <select className="form-control" style={{ width: 180 }} value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
          <option value="">{t('allLocations')}</option>
          {locations.map(l => (
            <option key={l._id} value={l._id}>{l.city} — {l.region || l.name}</option>
          ))}
        </select>
        <select className="form-control" style={{ width: 180 }} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="">{locale === 'ar' ? 'كل شهور التدريب' : 'All Training Months'}</option>
          <option value="july">{locale === 'ar' ? 'يوليو' : 'July'}</option>
          <option value="august">{locale === 'ar' ? 'أغسطس' : 'August'}</option>
          <option value="not_set">{locale === 'ar' ? 'غير محدد' : 'Not Set'}</option>
        </select>
        <select className="form-control" style={{ width: 180 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">{locale === 'ar' ? 'ترتيب: الاسم' : 'Sort: Name'}</option>
          <option value="month">{locale === 'ar' ? 'ترتيب: الشهر' : 'Sort: Month'}</option>
          <option value="status">{locale === 'ar' ? 'ترتيب: الحالة' : 'Sort: Status'}</option>
        </select>
      </div>

      {/* ── Student Table (card-style) ── */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* ── Header row ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.4fr 220px 200px 52px',
            gap: 0,
            padding: '10px 0',
            borderBottom: '2px solid var(--border)',
            background: 'var(--surface-alt, rgba(0,0,0,0.05))',
          }}>
            {[
              locale === 'ar' ? 'الطالب' : 'Student',
              locale === 'ar' ? 'الصيدلية / الموقع' : 'Pharmacy / Location',
              locale === 'ar' ? 'المشرف الحالي' : 'Current Teacher',
              locale === 'ar' ? 'تعيين مشرف' : 'Assign Teacher',
              '',
            ].map((label, i) => (
              <div key={i} style={{
                padding: '0 16px',
                fontSize: '0.7rem', fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* ── Empty state ── */}
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {locale === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching students found.'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
                {locale === 'ar' ? 'جرب تغيير الفلتر أو مسح البحث.' : 'Try adjusting your filters or search.'}
              </p>
            </div>
          ) : (
            filtered.map((s, idx) => {
              const loc = getLocationDisplay(s);
              const teacherName = getTeacherName(s);
              const teacherIdVal = getTeacherIdValue(s);
              const isCompleted = s.status === 'completed';
              const month = getStudentMonth(s);
              const monthLabel = month === 'july'
                ? (locale === 'ar' ? 'يوليو' : 'July')
                : month === 'august'
                  ? (locale === 'ar' ? 'أغسطس' : 'August')
                  : null;
              const initials = (s.userId?.name || '?').charAt(0).toUpperCase();
              const statusColor = isCompleted ? '#6366f1' : '#22c55e';
              const statusBg   = isCompleted ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)';

              return (
                <div
                  key={s._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.4fr 220px 200px 52px',
                    gap: 0,
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'transparent',
                    transition: 'background 0.15s',
                    alignItems: 'stretch',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >

                  {/* ── Col 1: Student ── */}
                  <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: statusBg, color: statusColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.05rem',
                      border: `2px solid ${statusColor}30`,
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      {/* Name + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {s.userId?.name || '—'}
                        </span>
                        <span style={{
                          fontSize: '10.5px', padding: '2px 8px', borderRadius: 99,
                          fontWeight: 700, background: statusBg, color: statusColor,
                        }}>
                          {isCompleted ? (locale === 'ar' ? '🏁 مكتمل' : '🏁 Done') : (locale === 'ar' ? '✅ نشط' : '✅ Active')}
                        </span>
                        {monthLabel && (
                          <span style={{
                            fontSize: '10.5px', padding: '2px 8px', borderRadius: 99,
                            fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                          }}>
                            📅 {monthLabel}
                          </span>
                        )}
                      </div>
                      {/* Email */}
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.userId?.email}
                      </p>
                      {/* University */}
                      {s.university && (
                        <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🎓 {s.university}
                        </p>
                      )}
                      {/* Training days */}
                      {Array.isArray(s.trainingDays) && s.trainingDays.length > 0 && (
                        <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                          🗓️ {s.trainingDays.length === 7
                            ? (locale === 'ar' ? 'كل الأيام' : 'All Days')
                            : s.trainingDays.map(d => ({
                                sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
                                wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
                              })[d] || d).join('، ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Col 2: Pharmacy / Location ── */}
                  <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      🏥 {s.pharmacyName || <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>{locale === 'ar' ? 'غير محدد' : 'Not set'}</span>}
                    </p>
                    {loc && (
                      <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        📍 {loc.city}{loc.region ? ` — ${loc.region}` : ''}
                      </p>
                    )}
                  </div>

                  {/* ── Col 3: Current Teacher ── */}
                  <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'center' }}>
                    {teacherName ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: '0.83rem', fontWeight: 700,
                        background: 'rgba(99,102,241,0.12)', color: '#6366f1',
                        padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap',
                      }}>
                        👨‍🏫 {teacherName}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.8rem', color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}>
                        {locale === 'ar' ? 'غير معين' : 'Unassigned'}
                      </span>
                    )}
                  </div>

                  {/* ── Col 4: Assign Teacher ── */}
                  <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                    <select
                      className="form-control"
                      style={{ fontSize: '0.83rem', padding: '7px 10px' }}
                      value={teacherIdVal}
                      onChange={e => assign(s._id, e.target.value)}
                      disabled={saving === s._id}
                    >
                      <option value="">{locale === 'ar' ? '— إلغاء التعيين —' : '— Unassign —'}</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                    {saving === s._id && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                        ⏳ {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </span>
                    )}
                  </div>

                  {/* ── Col 5: Edit ── */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      className="btn btn-icon btn-secondary"
                      title={locale === 'ar' ? 'تعديل' : 'Edit'}
                      onClick={() => openEditModal(s)}
                      style={{ padding: '8px 10px', fontSize: '1rem' }}
                    >
                      ✏️
                    </button>
                  </div>

                </div>
              );
            })
          )}

          {/* ── Footer ── */}
          {filtered.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              fontSize: '0.8rem', color: 'var(--text-muted)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>
                {locale === 'ar'
                  ? `عرض ${filtered.length} من ${students.length} طالب`
                  : `Showing ${filtered.length} of ${students.length} students`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Edit Modal ── */}

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
                  <select className="form-control" value={getEditTrainingMonthValue()} onChange={handleEditTrainingMonthChange}>
                    <option value="">{locale === 'ar' ? 'اختر شهر التدريب...' : 'Select training month...'}</option>
                    <option value="july">{locale === 'ar' ? 'شهر السابع' : 'July'}</option>
                    <option value="august">{locale === 'ar' ? 'شهر الثامن' : 'August'}</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
                    {locale === 'ar' ? 'أيام التدريب' : 'Training Days'}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {[
                      { key: 'sunday', ar: 'الأحد' }, { key: 'monday', ar: 'الاثنين' },
                      { key: 'tuesday', ar: 'الثلاثاء' }, { key: 'wednesday', ar: 'الأربعاء' },
                      { key: 'thursday', ar: 'الخميس' }, { key: 'friday', ar: 'الجمعة' },
                      { key: 'saturday', ar: 'السبت' },
                    ].map(({ key, ar }) => {
                      const sel = editForm.trainingDays.includes(key);
                      return (
                        <button key={key} type="button"
                          onClick={() => setEditForm(p => ({
                            ...p,
                            trainingDays: p.trainingDays.includes(key)
                              ? p.trainingDays.filter(d => d !== key)
                              : [...p.trainingDays, key],
                          }))}
                          style={{
                            padding: '7px 16px', borderRadius: 22,
                            border: `2px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                            background: sel ? 'var(--accent-dim)' : 'transparent',
                            color: sel ? 'var(--accent)' : 'var(--text-muted)',
                            fontWeight: sel ? 700 : 400, fontSize: '0.86rem',
                            cursor: 'pointer', transition: 'all 0.18s ease',
                          }}
                        >{ar}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{t('statusLabel')}</label>
                  <select className="form-control" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="active">{t('activeTraining')}</option>
                    <option value="completed">{t('completedHours')}</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{locale === 'ar' ? 'الصيدلية / الموقع' : 'Pharmacy / Location'}</label>
                  <select className="form-control" value={editForm.locationId} onChange={e => setEditForm(p => ({ ...p, locationId: e.target.value }))}>
                    <option value="">{locale === 'ar' ? '— غير محدد —' : '— Select Location —'}</option>
                    {locations.map(l => (
                      <option key={l._id} value={l._id}>{l.city} — {l.region || l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{t('roleTeacher')}</label>
                  <select className="form-control" value={editForm.teacherId} onChange={e => setEditForm(p => ({ ...p, teacherId: e.target.value }))}>
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
