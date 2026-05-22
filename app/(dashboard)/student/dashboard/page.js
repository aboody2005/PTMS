'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import { format, differenceInDays } from 'date-fns';
import { useTranslation } from '@/context/LanguageContext';

function ProfileRing({ pct }) {
  const r = 40, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--accent)" strokeWidth={8}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={50} y={54} textAnchor="middle" fill="var(--text-primary)" fontSize={16} fontWeight={700}
        style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>{pct}%</text>
    </svg>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { locale, t } = useTranslation();
  const [student, setStudent] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sRes = await api.students.my();
        const s = sRes.student;
        setStudent(s);
        // Fetch visits scoped to this specific student
        const vRes = await api.visits.list(s?._id ? { studentId: s._id } : {});
        setVisits(vRes.visits || []);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const calcCompletion = () => {
    if (student?.status === 'completed' || visits.length > 0) return 100;
    if (!student || !user) return 0;
    const fields = [user.name, user.email, user.phone, user.gender, user.profileImage,
      student.university, student.pharmacyName, student.startDate, student.endDate, student.locationId];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const daysLeft = () => {
    if (!student?.endDate) return null;
    return differenceInDays(new Date(student.endDate), new Date());
  };

  if (loading) return <div className="flex-center" style={{height:300}}><div className="spinner" /></div>;

  const completion = calcCompletion();
  const days = daysLeft();

  return (
    <div>
      <div className="page-header">
        <h1>{t('welcomeBack')} {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-muted">{locale === 'ar' ? 'إليك نظرة عامة على تدريبك' : "Here's your training overview"}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: '📋', label: t('statusLabel'), value: student?.status === 'completed' ? t('completedHours') : t('activeTraining'), color: 'var(--accent)', bg: 'var(--accent-dim)' },
          { icon: '✅', label: t('totalVisits'), value: visits.length, color: 'var(--green)', bg: 'var(--green-dim)' },
          { icon: '📅', label: locale === 'ar' ? 'الأيام المتبقية' : 'Days Remaining', value: days !== null ? (days > 0 ? days : t('completedHours')) : '—', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
          { icon: '🏥', label: locale === 'ar' ? 'الصيدلية' : 'Pharmacy', value: student?.pharmacyName || (locale === 'ar' ? 'غير محدد' : 'Not set'), color: 'var(--purple)', bg: 'var(--purple-dim)' },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="stat-info"><p>{label}</p><h3 style={{ fontSize: '1.1rem', color }}>{value}</h3></div>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        {/* Profile card */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">{locale === 'ar' ? 'نسبة اكتمال الملف الشخصي' : 'Profile Completion'}</h4>
            <Link href="/student/profile" className="btn btn-sm btn-secondary">{locale === 'ar' ? 'تعديل الملف' : 'Edit Profile'}</Link>
          </div>
          <div className="flex-responsive">
            <ProfileRing pct={completion} />
            <div style={{ flex: 1, width: '100%' }}>
              {[
                { label: locale === 'ar' ? 'الاسم الكامل' : 'Full Name', val: user?.name },
                { label: t('emailLabel'), val: user?.email },
                { label: t('phoneLabel'), val: user?.phone || (locale === 'ar' ? 'غير محدد' : 'Not set') },
                { label: t('universityLabel'), val: student?.university || (locale === 'ar' ? 'غير محدد' : 'Not set') },
                { label: locale === 'ar' ? 'الصيدلية' : 'Pharmacy', val: student?.pharmacyName || (locale === 'ar' ? 'غير محدد' : 'Not set') },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                  <span className="text-muted">{label}</span>
                  <span style={{ fontWeight: 500, maxWidth: '160px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Teacher & Training Info */}
        <div className="card">
          <div className="card-header"><h4 className="card-title">{locale === 'ar' ? 'تفاصيل التدريب' : 'Training Details'}</h4></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '2rem' }}>👨‍🏫</span>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{locale === 'ar' ? 'المشرف الأكاديمي المعين' : 'Assigned Teacher'}</p>
                <p style={{ fontWeight: 600 }}>{student?.teacherId?.name || (locale === 'ar' ? 'لم يتم التعيين بعد' : 'Not assigned yet')}</p>
                {student?.teacherId?.email && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{student.teacherId.email}</p>}
              </div>
            </div>
            {[
              { icon: '📍', label: locale === 'ar' ? 'الموقع' : 'Location', val: student?.locationId ? `${student.locationId.name}, ${student.locationId.city}` : (locale === 'ar' ? 'غير محدد' : 'Not set') },
              { icon: '📅', label: t('startDateLabel'), val: student?.startDate ? format(new Date(student.startDate), 'dd MMM yyyy') : (locale === 'ar' ? 'غير محدد' : 'Not set') },
              { icon: '🏁', label: t('endDateLabel'), val: student?.endDate ? format(new Date(student.endDate), 'dd MMM yyyy') : (locale === 'ar' ? 'غير محدد' : 'Not set') },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.875rem' }}>
                <span>{icon}</span>
                <span className="text-muted" style={{ width: 90 }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Visits */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header"><h4 className="card-title">{locale === 'ar' ? 'سجل الزيارات' : 'Visit History'}</h4></div>
          {visits.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '24px 0' }}>{locale === 'ar' ? 'لم يتم تسجيل أي زيارات بعد.' : 'No visits recorded yet.'}</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{locale === 'ar' ? 'المشرف' : 'Teacher'}</th>
                    <th>{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th>{locale === 'ar' ? 'الوقت' : 'Time'}</th>
                    <th>{locale === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                    <th>{t('statusLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.slice(0, 8).map(v => (
                    <tr key={v._id}>
                      <td>{v.teacherName}</td>
                      <td>{format(new Date(v.visitedAt), 'dd MMM yyyy')}</td>
                      <td>{format(new Date(v.visitedAt), 'HH:mm')}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.notes || '—'}</td>
                      <td><span className="badge badge-success">✅ {locale === 'ar' ? 'تمت الزيارة' : v.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
