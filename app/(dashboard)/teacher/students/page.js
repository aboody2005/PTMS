'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/context/LanguageContext';
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

export default function TeacherStudents() {
  const { locale, t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('visit'); // 'visit' | 'view'
  const [visiting, setVisiting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 1000 };
      if (locationFilter) params.locationId = locationFilter;

      const [sRes, allStudentsRes] = await Promise.all([
        api.students.list(params),
        api.students.list({ limit: 1000 }),
      ]);

      setStudents(sRes.students || []);
      setTotalPages(sRes.totalPages || 1);

      // Extract unique location objects from the teacher's students
      const locationMap = new Map();
      (allStudentsRes.students || []).forEach((student) => {
        if (student.locationId && student.locationId._id) {
          locationMap.set(student.locationId._id, student.locationId);
        }
      });
      const uniqueLocs = Array.from(locationMap.values()).sort((a, b) => {
        const cityCompare = (a.city || '').localeCompare(b.city || '');
        if (cityCompare !== 0) return cityCompare;
        return (a.name || '').localeCompare(b.name || '');
      });
      setLocations(uniqueLocs);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    Promise.resolve().then(() => { load(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, locationFilter]);

  const filtered = students
    .filter((s) => {
      const locStr = s.locationId ? `${s.locationId.city} ${s.locationId.region || s.locationId.name || ''}` : '';
      const pharmacy = s.pharmacyName || '';
      const matchSearch = !search ||
        s.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
        pharmacy.toLowerCase().includes(search.toLowerCase()) ||
        locStr.toLowerCase().includes(search.toLowerCase());
      const matchDay = !dayFilter || (Array.isArray(s.trainingDays) && s.trainingDays.includes(dayFilter));
      const matchTime = !timeFilter || s.attendanceStart === timeFilter;
      return matchSearch && matchDay && matchTime;
    })
    .sort((a, b) => (a.userId?.name || '').localeCompare(b.userId?.name || '', 'ar'));

  // Only show days/times that exist among THIS teacher's students
  const DAY_ORDER = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const DAY_LABELS = { sunday:'الأحد', monday:'الاثنين', tuesday:'الثلاثاء', wednesday:'الأربعاء', thursday:'الخميس', friday:'الجمعة', saturday:'السبت' };
  const availableDays = DAY_ORDER.filter(d =>
    students.some(s => Array.isArray(s.trainingDays) && s.trainingDays.includes(d))
  );
  const availableTimes = Object.keys(TIME_LABELS).filter(t =>
    students.some(s => s.attendanceStart === t)
  );


  /** Open student details in visit mode (can confirm visit) */
  const openVisit = (s) => {
    setSelected(s);
    setViewMode('visit');
  };

  /** Open student details in read-only view mode (already visited) */
  const openView = (s) => {
    setSelected(s);
    setViewMode('view');
  };

  const markVisited = async () => {
    if (!selected || visiting) return;
    setVisiting(true);
    try {
      await api.visits.create({ studentId: selected._id });
      toast.success(`✅ Visit confirmed for ${selected.userId?.name}`);
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to record visit. Please try again.');
    } finally {
      setVisiting(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('sideMyStudents')}</h1>
        <p className="text-muted">
          {locale === 'ar'
            ? `عرض وإدارة الطلاب المعينين لك في التدريب`
            : 'View and manage your assigned training students'}
          {' '}
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
            ({filtered.length} {locale === 'ar' ? 'طالب' : 'students'})
          </span>
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder={locale === 'ar' ? 'بحث بالاسم...' : 'Search by name...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-control"
          style={{ width: 220 }}
          value={locationFilter}
          onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
        >
          <option value="">{locale === 'ar' ? 'جميع المواقع' : 'All Locations'}</option>
          {locations.map((l) => (
            <option key={l._id} value={l._id}>
              {l.city} — {l.name}
            </option>
          ))}
        </select>
        {/* Day filter */}
        <select
          className="form-control"
          style={{ width: 180 }}
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
        >
          <option value="">{locale === 'ar' ? 'جميع الأيام' : 'All Days'}</option>
          {availableDays.map((d) => (
            <option key={d} value={d}>
              {DAY_LABELS[d] || d}
            </option>
          ))}
        </select>
        {/* Time filter */}
        <select
          className="form-control"
          style={{ width: 180 }}
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="">{locale === 'ar' ? 'جميع الأوقات' : 'All Times'}</option>
          {availableTimes.map((t) => (
            <option key={t} value={t}>
              {TIME_LABELS[t] || t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
      ) : (
        <>
          <div className="table-wrapper card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '850px' }}>
              <colgroup>
                <col style={{ width: '20%' }} />   {/* الطالب */}
                <col style={{ width: '22%' }} />  {/* الصيدلية / الموقع */}
                <col style={{ width: '10%' }} />  {/* الحالة */}
                <col style={{ width: '12%' }} />  {/* شهر التدريب */}
                <col style={{ width: '16%' }} />  {/* أيام التدريب */}
                <col style={{ width: '12%' }} />  {/* ساعات التواجد */}
                <col style={{ width: '8%' }} />   {/* الإجراءات */}
              </colgroup>
              <thead>
                <tr>
                  <th>{locale === 'ar' ? 'الطالب' : 'Student'}</th>
                  <th>{locale === 'ar' ? 'الصيدلية / الموقع' : 'Pharmacy / Location'}</th>
                  <th>{t('statusLabel')}</th>
                  <th>{locale === 'ar' ? 'شهر التدريب' : 'Month of Training'}</th>
                  <th>{locale === 'ar' ? 'أيام التدريب' : 'Training Days'}</th>
                  <th>{locale === 'ar' ? 'ساعات التواجد' : 'Attendance Hours'}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      {locale === 'ar' ? 'لم يتم العثور على طلاب.' : 'No students found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s._id}>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0 }}>
                            {s.userId?.profileImage
                              ? <img src={s.userId.profileImage} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              : s.userId?.name?.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.userId?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {s.locationId?.city || '—'}
                        <br />
                        <span className="text-muted text-xs">{s.pharmacyName || s.locationId?.name || '—'}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${s.status === 'completed' ? 'completed' : 'active'}`}>
                          {s.status === 'completed' ? t('completedHours') : t('activeTraining')}
                        </span>
                      </td>
                      <td className="text-xs text-muted">
                        {s.startDate ? (
                          s.startDate.includes('-07-') || s.startDate.endsWith('-07-01')
                            ? (locale === 'ar' ? 'شهر السابع' : 'July')
                            : s.startDate.includes('-08-') || s.startDate.endsWith('-08-01')
                              ? (locale === 'ar' ? 'شهر الثامن' : 'August')
                              : (locale === 'ar' ? 'غير محدد' : 'Not set')
                        ) : (locale === 'ar' ? 'غير محدد' : 'Not set')}
                      </td>
                      {/* Training Days */}
                      <td className="text-xs" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {Array.isArray(s.trainingDays) && s.trainingDays.length > 0
                          ? (s.trainingDays.length === 7
                              ? (locale === 'ar' ? 'كل الأيام' : 'All Days')
                              : s.trainingDays.map(d => ({
                                  sunday:'الأحد',monday:'الاثنين',tuesday:'الثلاثاء',wednesday:'الأربعاء',thursday:'الخميس',friday:'الجمعة',saturday:'السبت',
                                })[d] || d).join('، '))
                          : '—'}
                      </td>
                      {/* Attendance Hours */}
                      <td className="text-xs text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {s.attendanceStart && s.attendanceEnd
                          ? `${fmt12h(s.attendanceStart)} - ${fmt12h(s.attendanceEnd)}`
                          : s.attendanceStart ? fmt12h(s.attendanceStart)
                          : '—'}
                      </td>
                      <td>
                        {s.isVisited ? (
                          /* Visited: clickable badge that opens read-only details */
                          <button
                            className="badge badge-success"
                            style={{
                              padding: '6px 12px',
                              cursor: 'pointer',
                              border: 'none',
                              background: 'var(--success-dim, rgba(34,197,94,0.15))',
                              color: 'var(--success, #22c55e)',
                              borderRadius: 6,
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={() => openView(s)}
                            title={locale === 'ar' ? 'عرض تفاصيل الزيارة' : 'View visit details'}
                          >
                            ✓ {locale === 'ar' ? 'تمت الزيارة' : 'Visited'}
                            <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>
                              {locale === 'ar' ? '(عرض)' : '(view)'}
                            </span>
                          </button>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => openVisit(s)}
                          >
                            {locale === 'ar' ? '✅ زيارة' : '✅ Visit'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </>
      )}

      {/* ── Student Detail Modal (Visit or View mode) ── */}
      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              {viewMode === 'view' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>✅</span>
                    <h4 style={{ margin: 0 }}>
                      {locale === 'ar'
                        ? `تفاصيل الطالب — ${selected.userId?.name}`
                        : `Student Details — ${selected.userId?.name}`}
                    </h4>
                  </div>
                  {/* Visited banner */}
                  <div style={{
                    marginLeft: 'auto',
                    background: 'var(--success-dim, rgba(34,197,94,0.15))',
                    color: 'var(--success, #22c55e)',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}>
                    ✓ {locale === 'ar' ? 'تمت الزيارة' : 'Visited'}
                  </div>
                </>
              ) : (
                <h4>
                  {locale === 'ar'
                    ? `تأكيد الزيارة — ${selected.userId?.name}`
                    : `Confirm Visit — ${selected.userId?.name}`}
                </h4>
              )}
              <button onClick={closeModal} className="btn btn-icon btn-secondary">✕</button>
            </div>

            <div className="modal-body">
              {/* Student info grid */}
              <div className="grid grid-2" style={{ gap: 12, marginBottom: 16, fontSize: '0.875rem' }}>
                {[
                  [locale === 'ar' ? 'الطالب' : 'Student', selected.userId?.name || '—'],
                  [locale === 'ar' ? 'الهاتف' : 'Phone', selected.userId?.phone || '—'],
                  [locale === 'ar' ? 'الجنس' : 'Gender', selected.userId?.gender || '—'],
                  [locale === 'ar' ? 'الصيدلية' : 'Pharmacy', selected.pharmacyName || '—'],
                  [locale === 'ar' ? 'الموقع' : 'Location',
                    selected.locationId
                      ? `${selected.locationId.city}, ${selected.locationId.region || selected.locationId.name}`
                      : '—'],
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

              {/* Training Days — full width above attendance times */}
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


              {/* Visit date (read-only mode) */}
              {viewMode === 'view' && selected.visitDate && (
                <div style={{
                  background: 'var(--success-dim, rgba(34,197,94,0.1))',
                  border: '1px solid var(--success, #22c55e)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: '0.85rem',
                  color: 'var(--success, #22c55e)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>📅</span>
                  <span>
                    {locale === 'ar' ? 'تاريخ الزيارة: ' : 'Visited on: '}
                    <strong>{formatDateTime12h(selected.visitDate, locale)}</strong>
                  </span>
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
              <button className="btn btn-secondary" onClick={closeModal}>
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </button>
              {viewMode === 'visit' && (
                <button className="btn btn-success" onClick={markVisited} disabled={visiting}>
                  {visiting
                    ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...')
                    : (locale === 'ar' ? '✅ تأكيد الزيارة' : '✅ Confirm Visit')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
