'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = {
    student: [
      { href: '/student/dashboard', icon: '🏠', labelKey: 'sideDashboard' },
      { href: '/student/profile', icon: '👤', labelKey: 'sideMyProfile' },
    ],
    teacher: [
      { href: '/teacher/dashboard', icon: '🏠', labelKey: 'sideDashboard' },
      { href: '/teacher/students', icon: '🎓', labelKey: 'sideMyStudents' },
      { href: '/teacher/reports', icon: '📊', labelKey: 'sideReports' },
      { href: '/teacher/profile', icon: '👤', labelKey: 'sideMyProfile' },
    ],
    admin: [
      { href: '/admin/dashboard', icon: '🏠', labelKey: 'sideDashboard' },
      { href: '/admin/users', icon: '👥', labelKey: 'sideUsers' },
      { href: '/admin/assignments', icon: '🔗', labelKey: 'sideAssignments' },
      { href: '/admin/locations', icon: '📍', labelKey: 'sideLocations' },
      { href: '/admin/visits', icon: '👁', labelKey: 'sideVisits' },
      { href: '/admin/visits/student-data', icon: '🎓', labelKey: 'sideStudentData' },
      { href: '/admin/reports', icon: '📊', labelKey: 'sideReports' },
      { href: '/admin/profile', icon: '👤', labelKey: 'sideMyProfile' },
    ],
  };

  const items = navItems[user?.role] || [];
  const userRoleKey = user?.role
    ? `role${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`
    : '';

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    logout();
  };

  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={onClose} />}
      <div className={`${styles.sidebarWrapper} ${mobileOpen ? styles.openWrapper : ''}`}>
        <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''}`}>
          {/* Logo */}
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚕️</span>
            <span>PTMS</span>
          </div>

          {/* User info */}
          <div className={styles.userCard}>
            <div className={`avatar avatar-md ${styles.avatar}`}>
              {user?.profileImage
                ? <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : user?.name?.charAt(0).toUpperCase()
              }
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user?.name}</p>
              <span className={`badge badge-${user?.role === 'admin' ? 'error' : user?.role === 'teacher' ? 'info' : 'success'}`}>
                {t(userRoleKey)}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className={styles.nav}>
            {items.map(({ href, icon, labelKey }) => (
              <Link
                key={href}
                href={href}
                className={`${styles.navItem} ${pathname === href ? styles.active : ''}`}
                onClick={onClose}
              >
                <span className={styles.navIcon}>{icon}</span>
                <span>{t(labelKey)}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom */}
          <div className={styles.bottom}>
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              disabled={loggingOut}
              style={{ opacity: loggingOut ? 0.6 : 1, cursor: loggingOut ? 'wait' : 'pointer' }}
            >
              <span>{loggingOut ? '⏳' : '🚪'}</span>
              {loggingOut ? t('navLogout') + '...' : t('navLogout')}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
