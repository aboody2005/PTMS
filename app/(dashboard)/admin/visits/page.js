'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { useTranslation } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';
import { formatDateTime12h } from '@/utils/date';

const MapInner = dynamic(() => import('@/components/MapInner'), { ssr: false });

/** Convert stored 24h value (e.g. "16:00") to Arabic 12h label */
const TIME_LABELS = {
  '07:00': '7:00 صباحًا',  '08:00': '8:00 صباحًا',  '09:00': '9:00 صباحًا',
  '10:00': '10:00 صباحًا', '11:00': '11:00 صباحًا', '12:00': '12:00 ظهرًا',
  '13:00': '1:00 مساءً',   '14:00': '2:00 مساءً',   '15:00': '3:00 مساءً',
  '16:00': '4:00 مساءً',   '17:00': '5:00 مساءً',   '18:00': '6:00 مساءً',
  '19:00': '7:00 مساءً',   '20:00': '8:00 مساءً',   '21:00': '9:00 مساءً',
  '22:00': '10:00 مساءً',  '23:00': '11:00 مساءً',  '00:00': '12:00 منتصف الليل',
};
const fmt12h = (v) => (v && TIME_LABELS[v]) ? TIME_LABELS[v] : (v || '—');

export default function AdminVisits() {
  const { locale, t } = useTranslation();
  const [rows, setRows] = useState([]);        // all students enriched
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'visited' | 'not_visited'
  const [teacherFilter, setTeacherFilter] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  /* ─── Load all students (admin sees all) + visits ─── */
  const load = async () => {
    setLoading(true);
    try {
      // Fetch students with their profiles, location, and assigned teacher
      const { data: rawStudents, error: studErr } = await supabase
        .from('students')
        .select(`
          *,
          profiles!user_id(id, name, phone, gender, email, profile_image),
          locations(*),
          teacher:profiles!teacher_id(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (studErr) throw studErr;

      // Fetch all visits
      const { data: rawVisits } = await supabase
        .from('visits')
        .select('*');

      const visits = rawVisits || [];

      // Build enriched rows
      const enriched = (rawStudents || [])
        .filter(s => {
          const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          return p != null;
        })
        .map(s => {
          const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          const location = Array.isArray(s.locations) ? s.locations[0] : s.locations;
          const teacher = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher;
          const visit = visits.find(v => v.student_id === s.id);
          return {
            _id: s.id,
            name: profile?.name || '—',
            email: profile?.email || '',
            phone: profile?.phone || '—',
            gender: profile?.gender || '',
            profileImage: profile?.profile_image || '',
            university: s.university || '—',
            pharmacyName: s.pharmacy_name || '—',
            startDate: s.start_date || null,
            endDate: s.end_date || null,
            status: s.status || 'active',
            latitude: s.latitude || null,
            longitude: s.longitude || null,
            location: location ? { name: location.name, city: location.city, region: location.region } : null,
            teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
            isVisited: !!visit,
            visitDate: visit?.visited_at || null,
            visitNotes: visit?.notes || '',
            visitTeacherName: visit?.teacher_name || '',
            attendanceStart: s.attendance_start || '',
            attendanceEnd: s.attendance_end || '',
            trainingDays: Array.isArray(s.training_days) ? s.training_days : [],
          };
        });

      setRows(enriched);

      // Unique teachers
      const teacherMap = new Map();
      enriched.forEach(r => {
        if (r.teacher) teacherMap.set(r.teacher.id, r.teacher.name);
      });
      setTeachers(Array.from(teacherMap.entries()).map(([id, name]) => ({ id, name })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Filter ─── */
  const filtered = rows.filter(r => {
    const locStr = r.location ? `${r.location.city} ${r.location.region || ''}` : '';
    const pharmacy = r.pharmacyName || '';
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      pharmacy.toLowerCase().includes(search.toLowerCase()) ||
      locStr.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all' ? true :
      filterStatus === 'visited' ? r.isVisited :
      !r.isVisited;
    const matchTeacher = !teacherFilter || (r.teacher?.id === teacherFilter);
    return matchSearch && matchStatus && matchTeacher;
  }).sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.name.localeCompare(b.name, locale === 'ar' ? 'ar' : 'en');
    } else {
      return b.name.localeCompare(a.name, locale === 'ar' ? 'ar' : 'en');
    }
  });

  /* ─── Stats ─── */
  const visitedCount = rows.filter(r => r.isVisited).length;
  const notVisitedCount = rows.filter(r => !r.isVisited).length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1>{locale === 'ar' ? 'الزيارات الميدانية' : 'Field Visits'}</h1>
        <p className="text-muted">
          {locale === 'ar'
            ? 'نظرة شاملة على جميع زيارات الطلاب من قِبَل المشرفين'
            : 'Comprehensive overview of all student visits by supervisors'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3" style={{ marginBottom: 24, gap: 16 }}>
        {[
          {
            icon: '👥', label: locale === 'ar' ? 'إجمالي الطلاب' : 'Total Students',
            value: rows.length, color: 'var(--accent)', bg: 'var(--accent-dim)',
            onClick: () => setFilterStatus('all'),
            active: filterStatus === 'all',
          },
          {
            icon: '✅', label: locale === 'ar' ? 'تمت زيارتهم' : 'Visited',
            value: visitedCount, color: 'var(--green)', bg: 'var(--green-dim)',
            onClick: () => setFilterStatus('visited'),
            active: filterStatus === 'visited',
          },
          {
            icon: '⏳', label: locale === 'ar' ? 'لم تتم زيارتهم' : 'Not Visited',
            value: notVisitedCount, color: 'var(--yellow)', bg: 'var(--yellow-dim)',
            onClick: () => setFilterStatus('not_visited'),
            active: filterStatus === 'not_visited',
          },
        ].map(({ icon, label, value, color, bg, onClick, active }) => (
          <div
            key={label}
            className="stat-card"
            onClick={onClick}
            style={{
              cursor: 'pointer',
              outline: active ? `2px solid ${color}` : '2px solid transparent',
              transition: 'outline 0.15s',
            }}
          >
            <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="stat-info"><p>{label}</p><h3>{value}</h3></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder={locale === 'ar' ? 'بحث بالاسم...' : 'Search by name...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Visit Status Dropdown */}
        <select
          className="form-control"
          style={{ width: 180 }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">{locale === 'ar' ? 'جميع الطلاب' : 'All Students'}</option>
          <option value="visited">{locale === 'ar' ? 'تمت الزيارة' : 'Visited'}</option>
          <option value="not_visited">{locale === 'ar' ? 'لم تتم الزيارة' : 'Not Visited'}</option>
        </select>

        {/* Teacher Filter */}
        <select
          className="form-control"
          style={{ width: 200 }}
          value={teacherFilter}
          onChange={e => setTeacherFilter(e.target.value)}
        >
          <option value="">{locale === 'ar' ? 'جميع المشرفين' : 'All Supervisors'}</option>
          {teachers.map(tc => (
            <option key={tc.id} value={tc.id}>{tc.name}</option>
          ))}
        </select>

        {/* Sorting Dropdown */}
        <select
          className="form-control"
          style={{ width: 180 }}
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
        >
          <option value="asc">{locale === 'ar' ? 'ترتيب: أ - ي' : 'Sort: A - Z'}</option>
          <option value="desc">{locale === 'ar' ? 'ترتيب: ي - أ' : 'Sort: Z - A'}</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>{locale === 'ar' ? 'الطالب' : 'Student'}</th>
                <th>{locale === 'ar' ? 'الجامعة' : 'University'}</th>
                <th>{locale === 'ar' ? 'الصيدلية / الموقع' : 'Pharmacy / Location'}</th>
                <th>{locale === 'ar' ? 'المشرف الأكاديمي' : 'Supervisor'}</th>
                <th>{locale === 'ar' ? 'حالة الزيارة' : 'Visit Status'}</th>
                <th>{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    {locale === 'ar' ? 'لم يتم العثور على طلاب.' : 'No students found.'}
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r._id}>
                    {/* Student */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--accent-dim)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                        }}>
                          {r.profileImage
                            ? <img src={r.profileImage} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt={r.name} />
                            : r.name?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{r.name}</p>
                          <span className="text-muted text-xs" style={{ display: 'block' }}>{r.phone}</span>
                          {r.startDate && (
                            <span className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              📅 {r.startDate.includes('-07-') || r.startDate.endsWith('-07-01') ? (locale === 'ar' ? 'شهر السابع' : 'July') : r.startDate.includes('-08-') || r.startDate.endsWith('-08-01') ? (locale === 'ar' ? 'شهر الثامن' : 'August') : (locale === 'ar' ? 'غير محدد' : 'Not set')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* University */}
                    <td className="text-sm">{r.university}</td>

                    {/* Pharmacy / Location */}
                    <td className="text-sm">
                      {r.pharmacyName}
                      {r.location && (
                        <>
                          <br />
                          <span className="text-muted text-xs">{r.location.name} — {r.location.city}</span>
                        </>
                      )}
                    </td>

                    {/* Supervisor */}
                    <td className="text-sm">
                      {r.teacher
                        ? <span style={{ fontWeight: 500, color: 'var(--accent)' }}>👨‍🏫 {r.teacher.name}</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>

                    {/* Visit Status */}
                    <td>
                      {r.isVisited ? (
                        <div>
                          <span className="badge badge-success" style={{ display: 'block', marginBottom: 2 }}>
                            ✓ {locale === 'ar' ? 'تمت الزيارة' : 'Visited'}
                          </span>
                          {r.visitDate && (
                            <span className="text-xs text-muted">
                              {format(new Date(r.visitDate), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          background: 'rgba(239,68,68,0.12)',
                          color: '#f87171',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}>
                          ⏳ {locale === 'ar' ? 'لم تتم الزيارة' : 'Not Visited'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelected(r)}
                        title={locale === 'ar' ? 'عرض تفاصيل الزيارة' : 'View visit details'}
                      >
                        👁 {locale === 'ar' ? 'عرض الزيارة' : 'Show Visit'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>{selected.isVisited ? '✅' : '⏳'}</span>
                <h4 style={{ margin: 0 }}>
                  {locale === 'ar'
                    ? `تفاصيل الطالب — ${selected.name}`
                    : `Student Details — ${selected.name}`}
                </h4>
              </div>
              {selected.isVisited && (
                <div style={{
                  marginLeft: 'auto',
                  background: 'var(--success-dim, rgba(34,197,94,0.15))',
                  color: 'var(--success, #22c55e)',
                  padding: '4px 12px', borderRadius: 20,
                  fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                }}>
                  ✓ {locale === 'ar' ? 'تمت الزيارة' : 'Visited'}
                </div>
              )}
              <button onClick={() => setSelected(null)} className="btn btn-icon btn-secondary">✕</button>
            </div>

            <div className="modal-body">
              {/* Student info grid */}
              <div className="grid grid-2" style={{ gap: 12, marginBottom: 16, fontSize: '0.875rem' }}>
                {[
                  [locale === 'ar' ? 'الطالب' : 'Student', selected.name],
                  [locale === 'ar' ? 'الهاتف' : 'Phone', selected.phone],
                  [locale === 'ar' ? 'الجنس' : 'Gender',
                    selected.gender === 'male' ? (locale === 'ar' ? 'ذكر' : 'Male')
                    : selected.gender === 'female' ? (locale === 'ar' ? 'أنثى' : 'Female')
                    : '—'],
                  [locale === 'ar' ? 'الصيدلية' : 'Pharmacy', selected.pharmacyName],
                  [locale === 'ar' ? 'الموقع' : 'Location',
                    selected.location ? `${selected.location.city}, ${selected.location.name}` : '—'],
                  [locale === 'ar' ? 'المشرف الأكاديمي' : 'Supervisor',
                    selected.teacher?.name || '—'],
                  [locale === 'ar' ? 'الحالة' : 'Status',
                    selected.status === 'completed'
                      ? (locale === 'ar' ? 'مكتمل' : 'Completed')
                      : (locale === 'ar' ? 'نشط' : 'Active')],
                  [locale === 'ar' ? 'شهر التدريب' : 'Month of Training',
                    selected.startDate ? (
                      selected.startDate.includes('-07-') || selected.startDate.endsWith('-07-01')
                        ? (locale === 'ar' ? 'شهر السابع' : 'July')
                        : selected.startDate.includes('-08-') || selected.startDate.endsWith('-08-01')
                          ? (locale === 'ar' ? 'شهر الثامن' : 'August')
                          : (locale === 'ar' ? 'غير محدد' : 'Not set')
                    ) : '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</span>
                    <strong style={{ fontSize: '0.875rem' }}>{v}</strong>
                  </div>
                ))}
              </div>

              {/* Training Days — full width */}
              <div style={{ marginBottom: 12, fontSize: '0.875rem' }}>
                <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                  {locale === 'ar' ? 'أيام التدريب' : 'Training Days'}
                </span>
                <strong style={{ fontSize: '0.875rem' }}>
                  {Array.isArray(selected.trainingDays) && selected.trainingDays.length > 0
                    ? (selected.trainingDays.length === 7
                        ? (locale === 'ar' ? 'كل الأيام' : 'All Days')
                        : selected.trainingDays.map(d => ({
                            sunday:'الأحد',monday:'الاثنين',tuesday:'الثلاثاء',wednesday:'الأربعاء',thursday:'الخميس',friday:'الجمعة',saturday:'السبت',
                          })[d] || d).join('، '))
                    : '—'}
                </strong>
              </div>

              {/* Attendance times — side by side */}
              <div className="grid grid-2" style={{ gap: 12, marginBottom: 16, fontSize: '0.875rem' }}>
                {[
                  [locale === 'ar' ? 'وقت بداية التواجد' : 'Attendance Start', fmt12h(selected.attendanceStart)],
                  [locale === 'ar' ? 'وقت انتهاء التواجد' : 'Attendance End',  fmt12h(selected.attendanceEnd)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</span>
                    <strong style={{ fontSize: '0.875rem' }}>{v}</strong>
                  </div>
                ))}
              </div>

              {/* Visit Details */}
              {selected.isVisited && (
                <div style={{
                  background: 'var(--success-dim, rgba(34,197,94,0.1))',
                  border: '1px solid var(--success, #22c55e)',
                  borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--success, #22c55e)' }}>
                      <span>📅</span>
                      <span>
                        {locale === 'ar' ? 'تاريخ الزيارة: ' : 'Visited on: '}
                        <strong>{formatDateTime12h(selected.visitDate, locale)}</strong>
                      </span>
                    </div>
                    {selected.visitTeacherName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>👨‍🏫</span>
                        <span>
                          {locale === 'ar' ? 'زار بواسطة: ' : 'Visited by: '}
                          <strong>{selected.visitTeacherName}</strong>
                        </span>
                      </div>
                    )}
                    {selected.visitNotes && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 6 }}>
                        <p className="text-xs text-muted" style={{ margin: '0 0 4px' }}>
                          {locale === 'ar' ? 'ملاحظات الزيارة:' : 'Visit Notes:'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>{selected.visitNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Not visited notice */}
              {!selected.isVisited && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: '0.85rem', color: '#f87171',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>⏳</span>
                  <span>{locale === 'ar' ? 'لم يزر المشرف هذا الطالب بعد.' : 'Supervisor has not visited this student yet.'}</span>
                </div>
              )}

              {/* GPS map */}
              {selected.latitude && selected.longitude && (
                <div style={{ marginBottom: 16 }}>
                  <p className="form-label">
                    {locale === 'ar' ? 'موقع الطالب الجغرافي (GPS)' : "Student's GPS Location"}
                  </p>
                  <MapInner lat={selected.latitude} lng={selected.longitude} />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
