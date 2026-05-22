'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { exportReportsCSV } from '@/utils/exportCSV';
import { exportReportPDF } from '@/utils/exportPDF';
import { format } from 'date-fns';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';

export default function TeacherReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { locale, t } = useTranslation();

  useEffect(() => {
    async function load() {
      try {
        const data = await api.reports.get();
        setReports(data.reports || []);
        setStats(data.stats || {});
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleExportPDF = async () => {
    const loadingToast = toast.loading(locale === 'ar' ? 'جاري تحضير ملف PDF...' : 'Preparing PDF...');
    try {
      await exportReportPDF(reports, locale === 'ar' ? 'تقرير تدريب الطلاب' : 'Teacher Student Report', locale);
      toast.dismiss(loadingToast);
      toast.success(locale === 'ar' ? 'تم تحميل ملف PDF بنجاح!' : 'PDF downloaded successfully!');
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(locale === 'ar' ? 'فشل تحميل ملف PDF.' : 'Failed to generate PDF.');
    }
  };

  if (loading) return <div className="flex-center" style={{height:300}}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex-between" style={{flexWrap:'wrap', gap:12}}>
        <div>
          <h1>{t('sideReports')}</h1>
          <p className="text-muted">
            {locale === 'ar' ? 'تقارير تدريب الطلاب للمشرفين الأكاديميين' : 'Student training reports for academic supervisors'}
          </p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-secondary" onClick={() => exportReportsCSV(reports, locale === 'ar' ? 'تقرير_تدريب_الطلاب' : 'teacher_report', locale)}>📥 CSV</button>
          <button className="btn btn-primary" onClick={handleExportPDF}>📄 PDF / {t('sideReports')}</button>
        </div>
      </div>

      <div className="grid grid-4" style={{marginBottom:24}}>
        {[
          { label: t('totalStudents'), value: stats.totalStudents || 0, icon: '🎓', color: 'var(--accent)', bg: 'var(--accent-dim)' },
          { label: t('totalVisits'), value: stats.totalVisits || 0, icon: '✅', color: 'var(--green)', bg: 'var(--green-dim)' },
          { label: t('activeTraining'), value: stats.activeStudents || 0, icon: '🟢', color: 'var(--green)', bg: 'var(--green-dim)' },
          { label: t('completedHours'), value: stats.completedStudents || 0, icon: '🏁', color: 'var(--purple)', bg: 'var(--purple-dim)' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{background:bg,color}}>{icon}</div>
            <div className="stat-info"><p>{label}</p><h3>{value}</h3></div>
          </div>
        ))}
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
                <th>{t('statusLabel')}</th>
                <th>{locale === 'ar' ? 'الزيارات' : 'Visits'}</th>
                <th>{locale === 'ar' ? 'تاريخ آخر زيارة' : 'Last Visit'}</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0
                ? <tr><td colSpan={8} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>{t('noReportsYet')}</td></tr>
                : reports.map((r, i) => (
                  <tr key={r.student.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <p style={{fontWeight:600,fontSize:'0.875rem'}}>{r.student.name}</p>
                    </td>
                    <td className="text-sm">{r.student.university || '—'}</td>
                    <td className="text-sm">{r.student.pharmacyName || '—'}</td>
                    <td className="text-sm">{r.student.location ? `${r.student.location}, ${r.student.city}` : '—'}</td>
                    <td><span className={`badge badge-${r.student.status === 'completed' ? 'completed' : 'active'}`}>{r.student.status === 'completed' ? t('completedHours') : t('activeTraining')}</span></td>
                    <td><strong>{r.visitCount}</strong></td>
                    <td className="text-sm text-muted">{r.lastVisit ? format(new Date(r.lastVisit), 'dd/MM/yyyy') : (locale === 'ar' ? 'لا يوجد' : 'None')}</td>
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
