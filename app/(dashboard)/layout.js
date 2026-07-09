'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

const routeTitleKeys = {
  '/student/dashboard': 'sideDashboard',
  '/student/profile': 'sideMyProfile',
  '/teacher/dashboard': 'sideDashboard',
  '/teacher/students': 'sideMyStudents',
  '/teacher/reports': 'sideReports',
  '/teacher/profile': 'sideMyProfile',
  '/admin/dashboard': 'sideDashboard',
  '/admin/users': 'sideUsers',
  '/admin/assignments': 'sideAssignments',
  '/admin/locations': 'sideLocations',
  '/admin/visits': 'sideVisits',
  '/admin/reports': 'sideReports',
  '/admin/profile': 'sideMyProfile',
};

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  const titleKey = routeTitleKeys[pathname] || 'sideDashboard';
  const title = t(titleKey);

  return (
    <div className="dashboard-layout">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="dashboard-main">
        <Topbar onMenuToggle={() => setSidebarOpen(true)} title={title} />
        <div className="dashboard-content animate-fade">
          {children}
        </div>
      </main>
    </div>
  );
}
