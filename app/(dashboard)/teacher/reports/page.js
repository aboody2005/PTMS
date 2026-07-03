'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { exportReportsCSV, exportReportsExcel } from '@/utils/exportCSV';
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

  const handleExportExcel = async () => {
    const loadingToast = toast.loading(locale === 'ar' ? 'جاري تحضير ملف Excel...' : 'Preparing Excel...');
    try {
      // Build a set of the teacher's registered student names (from the reports already loaded)
      const registeredNames = new Set(
        reports.map((r) => r.student.name?.trim().toLowerCase()).filter(Boolean)
      );

      // Fetch the full official_students list and filter to only this teacher's unregistered ones:
      // an official student is "this teacher's" if their name matches one of the teacher's registered students
      // OR if they are already unregistered but their name is in the teacher's roster.
      // Simpler: fetch all official_students, keep those whose name is in registeredNames AND is_registered===false.
      let teacherUnregistered = [];
      try {
        const res = await fetch('/api/official-students');
        if (res.ok) {
          const data = await res.json();
          const all = data.students || [];
          teacherUnregistered = all.filter(
            (s) => !s.is_registered && registeredNames.has(s.name?.trim().toLowerCase())
          );
        }
      } catch (_) {}

      // Get teacher name from the first report entry
      const teacherName = reports[0]?.student?.teacher || '';

      await exportReportsExcel(
        reports,
        locale === 'ar' ? 'تقرير_تدريب_الطلاب' : 'teacher_report',
        locale,
        teacherUnregistered,
        teacherName,
      );
      toast.dismiss(loadingToast);
      toast.success(locale === 'ar' ? 'تم تحميل ملف Excel بنجاح!' : 'Excel downloaded successfully!');
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(locale === 'ar' ? 'فشل تحميل ملف Excel.' : 'Failed to generate Excel.');
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
          <button className="btn btn-primary" onClick={handleExportExcel}>📥 Excel / {t('sideReports')}</button>
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
                      {r.student.startDate && (
                        <p className="text-xs text-muted" style={{marginTop:2}}>
                          📅 {r.student.startDate.includes('-07-') || r.student.startDate.endsWith('-07-01') ? (locale === 'ar' ? 'شهر السابع' : 'July') : r.student.startDate.includes('-08-') || r.student.startDate.endsWith('-08-01') ? (locale === 'ar' ? 'شهر الثامن' : 'August') : ''}
                        </p>
                      )}
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
