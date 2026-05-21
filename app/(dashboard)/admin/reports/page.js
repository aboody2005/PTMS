'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { exportReportsCSV } from '@/utils/exportCSV';
import { exportReportPDF } from '@/utils/exportPDF';
import { format } from 'date-fns';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locations, setLocations] = useState([]);
  const [locationFilter, setLocationFilter] = useState('');
  const { locale, t } = useTranslation();

  useEffect(() => {
    async function load() {
      try {
        const [rData, lData] = await Promise.all([
          api.reports.get(),
          api.locations.list()
        ]);
        setReports(rData.reports || []);
        setStats(rData.stats || {});
        setLocations(lData.locations || []);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleExportPDF = async () => {
    const loadingToast = toast.loading(locale === 'ar' ? 'جاري تحضير ملف PDF...' : 'Preparing PDF...');
    try {
      await exportReportPDF(filtered, locale === 'ar' ? 'تقرير تدريب الطلاب الكامل' : 'Admin Full Report', locale);
      toast.dismiss(loadingToast);
      toast.success(locale === 'ar' ? 'تم تحميل ملف PDF بنجاح!' : 'PDF downloaded successfully!');
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(locale === 'ar' ? 'فشل تحميل ملف PDF.' : 'Failed to generate PDF.');
    }
  };

  const filtered = reports
    .filter(r => {
      const matchSearch = !search || r.student.name?.toLowerCase().includes(search.toLowerCase()) || r.student.email?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || r.student.status === statusFilter;
      const matchLocation = !locationFilter || r.student.locationId === locationFilter;
      return matchSearch && matchStatus && matchLocation;
    })
    .sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));

  if (loading) return <div className="flex-center" style={{height:300}}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex-between" style={{flexWrap:'wrap',gap:12}}>
        <div>
          <h1>{locale === 'ar' ? 'جميع تقارير التدريب' : 'All Reports'}</h1>
          <p className="text-muted">
            {locale === 'ar' 
              ? `${stats.totalStudents || 0} طالب، ${stats.totalVisits || 0} زيارة ميدانية تم تسجيلها`
              : `${stats.totalStudents || 0} students, ${stats.totalVisits || 0} visits logged`}
          </p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-secondary" onClick={() => exportReportsCSV(filtered, locale === 'ar' ? 'تقرير_الترشيح_الكامل' : 'admin_report', locale)}>📥 CSV</button>
          <button className="btn btn-primary" onClick={handleExportPDF}>📄 PDF / {t('sideReports')}</button>
        </div>
      </div>

      <div className="grid grid-4" style={{marginBottom:24}}>
        {[
          { label: t('totalStudents'), value: stats.totalStudents||0, icon: '🎓', color: 'var(--accent)', bg: 'var(--accent-dim)' },
          { label: t('activeTraining'), value: stats.activeStudents||0, icon: '🟢', color: 'var(--green)', bg: 'var(--green-dim)' },
          { label: t('completedHours'), value: stats.completedStudents||0, icon: '🏁', color: 'var(--purple)', bg: 'var(--purple-dim)' },
          { label: t('totalVisits'), value: stats.totalVisits||0, icon: '✅', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{background:bg,color}}>{icon}</div>
            <div className="stat-info"><p>{label}</p><h3>{value}</h3></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}} className="no-print">
        <div className="search-bar" style={{flex:1,minWidth:200}}>
          <span className="search-icon">🔍</span>
          <input className="form-control" placeholder={t('searchPlaceholder')} value={search}
            onChange={e => setSearch(e.target.value)} style={{paddingLeft:36}} />
        </div>
        <select className="form-control" style={{width:180}} value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{locale === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
          <option value="active">{t('activeTraining')}</option>
          <option value="completed">{t('completedHours')}</option>
        </select>
        <select className="form-control" style={{width:200}} value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}>
          <option value="">{t('allLocations')}</option>
          {locations.map(l => (
            <option key={l._id} value={l._id}>{l.region || l.name} — {l.city}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{padding:0}}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('studentName')}</th>
                <th>{t('universityLabel')}</th>
                <th>{locale === 'ar' ? 'صيدلية التدريب' : 'Pharmacy'}</th>
                <th>{locale === 'ar' ? 'موقع الصيدلية' : 'Location'}</th>
                <th>{t('roleTeacher')}</th>
                <th>{t('statusLabel')}</th>
                <th>{locale === 'ar' ? 'الزيارات' : 'Visits'}</th>
                <th>{locale === 'ar' ? 'تاريخ آخر زيارة' : 'Last Visit'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>{locale === 'ar' ? 'لا توجد بيانات متاحة حالياً.' : 'No data available.'}</td></tr>
                : filtered.map((r, i) => (
                  <tr key={r.student.id}>
                    <td className="text-muted">{i+1}</td>
                    <td>
                      <p style={{fontWeight:600,fontSize:'0.875rem'}}>{r.student.name}</p>
                      <p className="text-xs text-muted">{r.student.email}</p>
                    </td>
                    <td className="text-sm">{r.student.university||'—'}</td>
                    <td className="text-sm">{r.student.pharmacyName||'—'}</td>
                    <td className="text-sm">{r.student.location ? `${r.student.location}, ${r.student.city}` : '—'}</td>
                    <td className="text-sm">{r.student.teacher||<span className="text-muted">{locale === 'ar' ? 'غير معين' : 'Unassigned'}</span>}</td>
                    <td><span className={`badge badge-${r.student.status === 'completed' ? 'completed' : 'active'}`}>{r.student.status === 'completed' ? t('completedHours') : t('activeTraining')}</span></td>
                    <td><strong>{r.visitCount}</strong></td>
                    <td className="text-sm text-muted">{r.lastVisit ? format(new Date(r.lastVisit),'dd/MM/yyyy') : (locale === 'ar' ? 'لا يوجد' : 'None')}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
