'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/context/LanguageContext';

const MapInner = dynamic(() => import('@/components/MapInner'), { ssr: false });

export default function TeacherStudents() {
  const { locale, t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [visiting, setVisiting] = useState(false);
  const [visitNote, setVisitNote] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Track which students were visited this session for visual feedback
  const [visitedStudentIds, setVisitedStudentIds] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (locationFilter) params.locationId = locationFilter;

      // Fetch the paginated students for the current view and all students to extract locations
      const [sRes, allStudentsRes] = await Promise.all([
        api.students.list(params),
        api.students.list({ limit: 1000 })
      ]);

      setStudents(sRes.students || []);
      setTotalPages(sRes.totalPages || 1);

      // Extract unique location objects from the teacher's students
      const locationMap = new Map();
      (allStudentsRes.students || []).forEach(student => {
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

  useEffect(() => { load(); }, [page, locationFilter]);

  const filtered = students
    .filter(s => !search || s.userId?.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.userId?.name || '').localeCompare(b.userId?.name || ''));

  const markVisited = async () => {
    if (!selected || visiting) return;
    setVisiting(true);
    try {
      const result = await api.visits.create({ studentId: selected._id, notes: visitNote });
      // Mark this student as visited locally
      setVisitedStudentIds(prev => new Set([...prev, selected._id]));
      toast.success(`✅ Visit confirmed for ${selected.userId?.name}`);
      setSelected(null);
      setVisitNote('');
      await load(); // Refresh the list from server to get new status
    } catch (err) {
      toast.error(err.message || 'Failed to record visit. Please try again.');
    } finally {
      setVisiting(false);
    }
  };


  return (
    <div>
      <div className="page-header">
        <h1>{t('sideMyStudents')}</h1>
        <p className="text-muted">
          {locale === 'ar' ? 'عرض وإدارة الطلاب المعينين لك في التدريب' : 'View and manage your assigned training students'}
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
            onChange={e => setSearch(e.target.value)} 
            style={{ paddingLeft: 36 }} 
          />
        </div>
        <select 
          className="form-control" 
          style={{ width: 220 }} 
          value={locationFilter}
          onChange={e => { setLocationFilter(e.target.value); setPage(1); }}
        >
          <option value="">{locale === 'ar' ? 'جميع المواقع' : 'All Locations'}</option>
          {locations.map(l => (
            <option key={l._id} value={l._id}>
              {l.name} — {l.city}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? <div className="flex-center" style={{height:200}}><div className="spinner" /></div> : (
        <>
          <div className="table-wrapper card" style={{padding:0}}>
            <table>
              <thead>
                <tr>
                  <th>{locale === 'ar' ? 'الطالب' : 'Student'}</th>
                  <th>{t('universityLabel')}</th>
                  <th>{locale === 'ar' ? 'الصيدلية / الموقع' : 'Pharmacy / Location'}</th>
                  <th>{t('statusLabel')}</th>
                  <th>{locale === 'ar' ? 'التواريخ' : 'Dates'}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={6} style={{textAlign:'center', padding:'32px', color:'var(--text-muted)'}}>{locale === 'ar' ? 'لم يتم العثور على طلاب.' : 'No students found.'}</td></tr>
                  : filtered.map(s => (
                    <tr key={s._id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:34,height:34,borderRadius:'50%',background:'var(--accent-dim)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:'0.85rem',flexShrink:0}}>
                            {s.userId?.profileImage ? <img src={s.userId.profileImage} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : s.userId?.name?.charAt(0)}
                          </div>
                          <div>
                            <p style={{fontWeight:600,fontSize:'0.875rem'}}>{s.userId?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{s.university || '—'}</td>
                      <td className="text-sm">{s.pharmacyName || s.locationId?.name || '—'}<br/><span className="text-muted text-xs">{s.locationId?.city}</span></td>
                      <td>
                        <span className={`badge badge-${s.status === 'completed' ? 'completed' : 'active'}`}>
                          {s.status === 'completed' ? t('completedHours') : t('activeTraining')}
                        </span>
                      </td>
                      <td className="text-xs text-muted">
                        {s.startDate ? format(new Date(s.startDate), 'dd/MM/yy') : '?'} – {s.endDate ? format(new Date(s.endDate), 'dd/MM/yy') : '?'}
                      </td>
                      <td>
                        {s.isVisited || visitedStudentIds.has(s._id)
                          ? <span className="badge badge-success" style={{padding:'6px 12px'}}>{locale === 'ar' ? '✓ تمت الزيارة' : '✓ Visited'}</span>
                          : <button className="btn btn-success btn-sm" onClick={() => setSelected(s)}>{locale === 'ar' ? '✅ زيارة' : '✅ Visit'}</button>
                        }
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              {locale === 'ar' ? 'السابق →' : '← Prev'}
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              {locale === 'ar' ? '← التالي' : 'Next →'}
            </button>
          </div>
        </>
      )}

      {/* Visit Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{locale === 'ar' ? `تأكيد الزيارة — ${selected.userId?.name}` : `Confirm Visit — ${selected.userId?.name}`}</h4>
              <button onClick={() => setSelected(null)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ gap: 12, marginBottom: 16, fontSize: '0.875rem' }}>
                {[
                  [locale === 'ar' ? 'الطالب' : 'Student', selected.userId?.name || '—'],
                  [locale === 'ar' ? 'الهاتف' : 'Phone', selected.userId?.phone || '—'],
                  [locale === 'ar' ? 'الصيدلية' : 'Pharmacy', selected.pharmacyName || '—'],
                  [locale === 'ar' ? 'الموقع' : 'Location', selected.locationId ? `${selected.locationId.name}, ${selected.locationId.city}` : '—'],
                ].map(([l, v]) => (
                  <div key={l}><span className="text-muted">{l}:</span> <strong>{v}</strong></div>
                ))}
              </div>
              {selected.latitude && selected.longitude && (
                <div style={{ marginBottom: 16 }}>
                  <p className="form-label">{locale === 'ar' ? 'موقع الطالب الجغرافي (GPS)' : "Student's GPS Location"}</p>
                  <MapInner lat={selected.latitude} lng={selected.longitude} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{locale === 'ar' ? 'ملاحظات الزيارة (اختياري)' : 'Visit Notes (optional)'}</label>
                <textarea className="form-control" rows={3} placeholder={locale === 'ar' ? 'أضف أي ملاحظات حول هذه الزيارة...' : 'Add any notes about this visit...'}
                  value={visitNote} onChange={e => setVisitNote(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button className="btn btn-success" onClick={markVisited} disabled={visiting}>
                {visiting 
                  ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...') 
                  : (locale === 'ar' ? '✅ تأكيد الزيارة' : '✅ Confirm Visit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
