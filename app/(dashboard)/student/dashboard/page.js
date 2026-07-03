'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import { format } from 'date-fns';
import { useTranslation } from '@/context/LanguageContext';
import { formatTimeOnly12h } from '@/utils/date';

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
      student.university, student.pharmacyName, student.startDate, student.locationId];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const daysLeft = () => {
    // Derive end date from training month (startDate holds month info)
    // No month selected → 0
    if (!student?.startDate) return 0;

    const datePart = student.startDate.split('T')[0]; // e.g. "2026-07-01"
    const month = parseInt(datePart.split('-')[1], 10); // 7 = July, 8 = August
    const year = parseInt(datePart.split('-')[0], 10);

    // Both July (7) and August (8) have 31 days
    if (month !== 7 && month !== 8) return 0;

    const endUtc = new Date(Date.UTC(year, month - 1, 31)); // Jul 31 or Aug 31

    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const diff = Math.floor((endUtc - todayUtc) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
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
          {
            icon: '✅',
            label: locale === 'ar' ? 'حالة الزيارة' : 'Visit Status',
            value: visits.length > 0
              ? (locale === 'ar' ? 'تمت الزيارة' : 'Visited')
              : (locale === 'ar' ? 'لم تتم الزيارة' : 'Not Visited'),
            color: visits.length > 0 ? 'var(--green)' : 'var(--text-secondary)',
            bg: visits.length > 0 ? 'var(--green-dim)' : 'var(--surface-alt)'
          },
          { icon: '📅', label: locale === 'ar' ? 'الأيام المتبقية' : 'Days Remaining', value: days > 0 ? days : (days === 0 ? 0 : t('completedHours')), color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
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
                { label: locale === 'ar' ? 'الصيدلية' : 'Pharmacy', val: student?.pharmacyName || (locale === 'ar' ? 'غير محدد' : 'Not set') },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem', gap: 12 }}>
                  <span className="text-muted" style={{ flexShrink: 0 }}>{label}</span>
                  <span style={{ fontWeight: 500, maxWidth: '60%', textAlign: locale === 'ar' ? 'left' : 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>{val}</span>
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
                <p style={{ fontWeight: 600 }}>
                  {student?.teacherId
                    ? (locale === 'ar' ? 'تم تعيين مشرف أكاديمي' : 'Assigned')
                    : (locale === 'ar' ? 'لم يتم التعيين بعد' : 'Not assigned yet')}
                </p>
              </div>
            </div>
            {[
              { icon: '📍', label: locale === 'ar' ? 'الموقع' : 'Location', val: student?.locationId ? `${student.locationId.name}, ${student.locationId.city}` : (locale === 'ar' ? 'غير محدد' : 'Not set') },
              { icon: '📅', label: locale === 'ar' ? 'شهر التدريب' : 'Month of Training', val: student?.startDate ? (student.startDate.includes('-07-') ? (locale === 'ar' ? 'شهر السابع' : 'July') : student.startDate.includes('-08-') ? (locale === 'ar' ? 'شهر الثامن' : 'August') : (locale === 'ar' ? 'غير محدد' : 'Not set')) : (locale === 'ar' ? 'غير محدد' : 'Not set') },
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
                    <th>{locale === 'ar' ? 'المشرف' : 'Supervisor'}</th>
                    <th>{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th>{locale === 'ar' ? 'الوقت' : 'Time'}</th>
                    <th>{t('statusLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.slice(0, 8).map(v => (
                    <tr key={v._id}>
                      <td>{locale === 'ar' ? 'المشرف الأكاديمي' : 'Academic Supervisor'}</td>
                      <td>{format(new Date(v.visitedAt), 'dd MMM yyyy')}</td>
                      <td>{formatTimeOnly12h(v.visitedAt, locale)}</td>
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
