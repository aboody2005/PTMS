'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { useTranslation } from '@/context/LanguageContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#8b949e', font: { family: 'Inter' } } } },
};

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { locale, t } = useTranslation();

  useEffect(() => {
    async function load() {
      try {
        const [rRes, uRes] = await Promise.all([api.reports.get(), api.users.list({ limit: 1000 })]);
        setReports(rRes.reports || []);
        setStats(rRes.stats || {});
        setUsers(uRes.users || []);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="flex-center" style={{height:300}}><div className="spinner" /></div>;

  const teachers = users.filter(u => u.role === 'teacher').length;
  const students = users.filter(u => u.role === 'student').length;

  const doughnutData = {
    labels: [
      t('activeTraining'),
      t('completedHours')
    ],
    datasets: [{ data: [stats.activeStudents || 0, stats.completedStudents || 0],
      backgroundColor: ['#3fb950', '#7c3aed'], borderColor: 'transparent', borderWidth: 4 }],
  };

  // Visits per month (last 6 months)
  const months = locale === 'ar' 
    ? ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i);
    return { label: months[d.getMonth()], month: d.getMonth(), year: d.getFullYear() };
  });
  const visitsByMonth = last6.map(({ month, year }) => {
    return reports.reduce((acc, r) => acc + r.visits.filter(v => {
      const vd = new Date(v.visitedAt);
      return vd.getMonth() === month && vd.getFullYear() === year;
    }).length, 0);
  });

  const barData = {
    labels: last6.map(m => m.label),
    datasets: [{ label: locale === 'ar' ? 'الزيارات' : 'Visits', data: visitsByMonth, backgroundColor: 'rgba(0,212,255,0.6)', borderRadius: 6, borderSkipped: false }],
  };
  const barOpts = { ...chartOpts, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.6)' } }, y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.6)' }, beginAtZero: true } } };

  return (
    <div>
      <div className="page-header">
        <h1>{locale === 'ar' ? 'لوحة التحكم للمسؤول' : 'Admin Dashboard'}</h1>
        <p className="text-muted">{locale === 'ar' ? 'نظرة عامة على النظام والتحليلات' : 'System overview and analytics'}</p>
      </div>

      <div className="grid grid-4" style={{marginBottom:24}}>
        {[
          { icon: '👥', label: locale === 'ar' ? 'إجمالي المستخدمين' : 'Total Users', value: users.length, color: 'var(--accent)', bg: 'var(--accent-dim)' },
          { icon: '🎓', label: t('totalStudents'), value: students, color: 'var(--green)', bg: 'var(--green-dim)' },
          { icon: '👨‍🏫', label: t('totalTeachers'), value: teachers, color: 'var(--purple)', bg: 'var(--purple-dim)' },
          { icon: '✅', label: t('totalVisits'), value: stats.totalVisits || 0, color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{background:bg,color}}>{icon}</div>
            <div className="stat-info"><p>{label}</p><h3>{value}</h3></div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{marginBottom:24}}>
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">{locale === 'ar' ? 'توزيع حالة الطلاب' : 'Student Status Distribution'}</h4>
          </div>
          <div style={{height:240}}><Doughnut data={doughnutData} options={chartOpts} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">{locale === 'ar' ? 'الزيارات شهرياً (آخر 6 أشهر)' : 'Visits per Month (Last 6)'}</h4>
          </div>
          <div style={{height:240}}><Bar data={barData} options={barOpts} /></div>
        </div>
      </div>

      {/* Recent students table */}
      <div className="card" style={{padding:0}}>
        <div className="card-header" style={{padding:'16px 20px'}}>
          <h4 className="card-title">{locale === 'ar' ? 'المستخدمون المنضمون حديثاً' : 'Recently Joined Users'}</h4>
          <a href="/admin/users" className="btn btn-sm btn-secondary">{locale === 'ar' ? 'عرض الكل' : 'View All'}</a>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}</th>
                <th>{locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</th>
                <th>{locale === 'ar' ? 'الدور' : 'Role'}</th>
                <th>{locale === 'ar' ? 'تاريخ الانضمام' : 'Joined'}</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 8).map(u => (
                <tr key={u._id}>
                  <td style={{fontWeight:600,fontSize:'0.875rem'}}>{u.name}</td>
                  <td className="text-sm text-muted">{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.role === 'admin' ? 'error' : u.role === 'teacher' ? 'info' : 'success'}`}>
                      {u.role === 'admin' ? t('roleAdmin') : u.role === 'teacher' ? t('roleTeacher') : t('roleStudent')}
                    </span>
                  </td>
                  <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
