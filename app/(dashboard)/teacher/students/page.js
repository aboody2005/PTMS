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
  const [visitFilter, setVisitFilter] = useState('all'); // 'all' | 'visited' | 'not_visited'
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('visit'); // 'visit' | 'view'
  const [visiting, setVisiting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const matchVisit = visitFilter === 'all'
        ? true
        : visitFilter === 'visited'
          ? s.isVisited
          : !s.isVisited;
      return matchSearch && matchDay && matchTime && matchVisit;
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

      {/* Stats Cards */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {[
          {
            key: 'all',
            label: locale === 'ar' ? 'إجمالي الطلاب' : 'Total Students',
            value: students.length,
            icon: '👥',
            color: 'var(--accent)',
            bg: 'var(--accent-dim)'
          },
          {
            key: 'visited',
            label: locale === 'ar' ? 'تمت زيارتهم' : 'Visited',
            value: students.filter(s => s.isVisited).length,
            icon: '✅',
            color: 'var(--green)',
            bg: 'var(--green-dim)'
          },
          {
            key: 'not_visited',
            label: locale === 'ar' ? 'لم تتم زيارتهم' : 'Not Visited',
            value: students.filter(s => !s.isVisited).length,
            icon: '⌛',
            color: 'var(--yellow)',
            bg: 'var(--yellow-dim)'
          }
        ].map(({ key, label, value, icon, color, bg }) => {
          const isActive = visitFilter === key;
          return (
            <div
              key={key}
              className="stat-card"
              style={{
                cursor: 'pointer',
                border: isActive ? `2px solid ${color}` : '2px solid transparent',
                transform: isActive ? 'scale(1.02)' : 'none',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
              }}
              onClick={() => setVisitFilter(key)}
            >
              <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
              <div className="stat-info">
                <p>{label}</p>
                <h3>{value}</h3>
              </div>
            </div>
          );
        })}
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

      {/* ── Student List (Card-based design like admin/assignments) ── */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* ── Header row (Only on Desktop) ── */}
          {!isMobile && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 1.8fr 1.6fr 1.2fr 120px',
              gap: 0,
              padding: '10px 0',
              borderBottom: '2px solid var(--border)',
              background: 'var(--surface-alt, rgba(0,0,0,0.05))',
            }}>
              {[
                locale === 'ar' ? 'الطالب' : 'Student',
                locale === 'ar' ? 'الصيدلية / الموقع' : 'Pharmacy / Location',
                locale === 'ar' ? 'أيام التدريب' : 'Training Days',
                locale === 'ar' ? 'ساعات التواجد' : 'Attendance Hours',
                locale === 'ar' ? 'الإجراءات' : 'Actions',
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
          )}

          {/* ── Empty state ── */}
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {locale === 'ar' ? 'لم يتم العثور على طلاب.' : 'No students found.'}
              </p>
            </div>
          ) : (
            filtered.map((s, idx) => {
              const isCompleted = s.status === 'completed';
              const monthLabel = s.startDate ? (
                s.startDate.includes('-07-') || s.startDate.endsWith('-07-01')
                  ? (locale === 'ar' ? 'شهر السابع' : 'July')
                  : s.startDate.includes('-08-') || s.startDate.endsWith('-08-01')
                    ? (locale === 'ar' ? 'شهر الثامن' : 'August')
                    : null
              ) : null;
              const initials = s.userId?.name ? s.userId.name.charAt(0).toUpperCase() : '?';
              const statusColor = isCompleted ? '#6366f1' : '#22c55e';
              const statusBg   = isCompleted ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)';

              if (isMobile) {
                return (
                  <div
                    key={s._id}
                    style={{
                      padding: '16px',
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      background: 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {/* Top row: Avatar + Identity + Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        {/* Avatar */}
                        <div style={{
                          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                          background: statusBg, color: statusColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '1.05rem',
                          border: `2px solid ${statusColor}30`,
                        }}>
                          {s.userId?.profileImage ? (
                            <img src={s.userId.profileImage} style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
                          ) : (
                            initials
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          {/* Name + Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {s.userId?.name || '—'}
                            </span>
                            <span style={{
                              fontSize: '10px', padding: '2px 8px', borderRadius: 99,
                              fontWeight: 700, background: statusBg, color: statusColor,
                            }}>
                              {isCompleted ? (locale === 'ar' ? '🏁 مكتمل' : '🏁 Done') : (locale === 'ar' ? '✅ نشط' : '✅ Active')}
                            </span>
                            {monthLabel && (
                              <span style={{
                                fontSize: '10px', padding: '2px 8px', borderRadius: 99,
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
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ flexShrink: 0 }}>
                        {s.isVisited ? (
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
                            }}
                            onClick={() => openView(s)}
                          >
                            ✓ {locale === 'ar' ? 'تمت الزيارة' : 'Visited'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => openVisit(s)}
                          >
                            {locale === 'ar' ? '✅ زيارة' : '✅ Visit'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle: Details Block */}
                    <div style={{
                      padding: '12px',
                      background: 'var(--surface-alt, rgba(0,0,0,0.03))',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span>🏥</span>
                        <span>{s.pharmacyName || (locale === 'ar' ? 'غير مححدد' : 'Not set')}</span>
                      </div>
                      {s.locationId && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>📍</span>
                          <span>{s.locationId.city} — {s.locationId.name}</span>
                        </div>
                      )}
                      {/* Training days */}
                      {Array.isArray(s.trainingDays) && s.trainingDays.length > 0 && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🗓️</span>
                          <span>
                            {s.trainingDays.length === 7
                              ? (locale === 'ar' ? 'كل الأيام' : 'All Days')
                              : s.trainingDays.map(d => ({
                                  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
                                  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
                                })[d] || d).join('، ')}
                          </span>
                        </div>
                      )}
                      {/* Attendance start/end */}
                      {s.attendanceStart && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⏰</span>
                          <span>
                            {s.attendanceStart && s.attendanceEnd
                              ? `${fmt12h(s.attendanceStart)} - ${fmt12h(s.attendanceEnd)}`
                              : fmt12h(s.attendanceStart)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Desktop view
              return (
                <div
                  key={s._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.2fr 1.8fr 1.6fr 1.2fr 120px',
                    gap: 0,
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'transparent',
                    transition: 'background 0.15s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Col 1: Student info */}
                  <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: statusBg, color: statusColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.05rem',
                      border: `2px solid ${statusColor}30`,
                    }}>
                      {s.userId?.profileImage ? (
                        <img src={s.userId.profileImage} style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
                      ) : (
                        initials
                      )}
                    </div>
                    <div style={{ minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {s.userId?.name || '—'}
                        </span>
                        <span style={{
                          fontSize: '10.5px', padding: '2px 8px', borderRadius: 99,
                          fontWeight: 700, background: statusBg, color: statusColor,
                          whiteSpace: 'nowrap'
                        }}>
                          {isCompleted ? (locale === 'ar' ? '🏁 مكتمل' : '🏁 Done') : (locale === 'ar' ? '✅ نشط' : '✅ Active')}
                        </span>
                        {monthLabel && (
                          <span style={{
                            fontSize: '10.5px', padding: '2px 8px', borderRadius: 99,
                            fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                            whiteSpace: 'nowrap'
                          }}>
                            📅 {monthLabel}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        {s.userId?.email}
                      </p>
                      {s.university && (
                        <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🎓 {s.university}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Pharmacy / Location */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <span>🏥</span>
                      <span>{s.pharmacyName || <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>{locale === 'ar' ? 'غير محدد' : 'Not set'}</span>}</span>
                    </p>
                    {s.locationId && (
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        <span>📍</span>
                        <span>{s.locationId.city} — {s.locationId.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Col 3: Training days */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                    {Array.isArray(s.trainingDays) && s.trainingDays.length > 0 ? (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        <span>🗓️</span>
                        <span>
                          {s.trainingDays.length === 7
                            ? (locale === 'ar' ? 'كل الأيام' : 'All Days')
                            : s.trainingDays.map(d => ({
                                sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
                                wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
                              })[d] || d).join('، ')}
                        </span>
                      </p>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
                    )}
                  </div>

                  {/* Col 4: Attendance hours */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                    {s.attendanceStart ? (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        <span>⏰</span>
                        <span>
                          {s.attendanceStart && s.attendanceEnd
                            ? `${fmt12h(s.attendanceStart)} - ${fmt12h(s.attendanceEnd)}`
                            : fmt12h(s.attendanceStart)}
                        </span>
                      </p>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
                    )}
                  </div>

                  {/* Col 5: Actions */}
                  <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    {s.isVisited ? (
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
                      </button>
                    ) : (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => openVisit(s)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {locale === 'ar' ? '✅ زيارة' : '✅ Visit'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
