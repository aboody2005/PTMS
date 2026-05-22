'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { useTranslation } from '@/context/LanguageContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const { locale, t } = useTranslation();

  useEffect(() => {
    async function load() {
      try {
        const [sRes, vRes] = await Promise.all([
          api.students.list({ limit: 100 }),
          api.visits.list(),
        ]);
        setStudents(sRes.students || []);
        setVisits(vRes.visits || []);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="flex-center" style={{height:300}}><div className="spinner" /></div>;

  const active = students.filter(s => s.status === 'active').length;
  const completed = students.filter(s => s.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <h1>{locale === 'ar' ? 'لوحة تحكم المشرف' : 'Teacher Dashboard'}</h1>
        <p className="text-muted">{t('welcomeBack')} {user?.name}</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: '🎓', label: t('totalStudents'), value: students.length, color: 'var(--accent)', bg: 'var(--accent-dim)' },
          { icon: '✅', label: t('activeTraining'), value: active, color: 'var(--green)', bg: 'var(--green-dim)' },
          { icon: '🏁', label: t('completedHours'), value: completed, color: 'var(--purple)', bg: 'var(--purple-dim)' },
          { icon: '📋', label: t('totalVisits'), value: visits.length, color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="stat-info"><p>{label}</p><h3>{value}</h3></div>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        {/* Students preview */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">{t('sideMyStudents')}</h4>
            <a href="/teacher/students" className="btn btn-sm btn-secondary">{locale === 'ar' ? 'عرض الكل' : 'View All'}</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {students.slice(0, 5).map(s => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
                  {s.userId?.name?.charAt(0)}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.userId?.name}</p>
                  <p className="text-xs text-muted">{s.pharmacyName || s.locationId?.name || '—'}</p>
                </div>
                <span className={`badge badge-${s.status === 'completed' ? 'completed' : 'active'}`}>
                  {s.status === 'completed' ? t('completedHours') : t('activeTraining')}
                </span>
              </div>
            ))}
            {students.length === 0 && <p className="text-muted text-sm" style={{textAlign:'center', padding:'16px 0'}}>{locale === 'ar' ? 'لم يتم تعيين طلاب بعد.' : 'No students assigned yet.'}</p>}
          </div>
        </div>

        {/* Recent Visits */}
        <div className="card">
          <div className="card-header"><h4 className="card-title">{locale === 'ar' ? 'الزيارات الأخيرة' : 'Recent Visits'}</h4></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visits.slice(0, 5).map(v => (
              <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--green-dim)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>✅</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{v.studentName}</p>
                  <p className="text-xs text-muted">{format(new Date(v.visitedAt), 'dd MMM yyyy, HH:mm')}</p>
                </div>
              </div>
            ))}
            {visits.length === 0 && <p className="text-muted text-sm" style={{textAlign:'center', padding:'16px 0'}}>{locale === 'ar' ? 'لم يتم تسجيل أي زيارات بعد.' : 'No visits recorded yet.'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
