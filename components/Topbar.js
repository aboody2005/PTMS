'use client';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/context/LanguageContext';
import { api } from '@/utils/api';
import { format } from 'date-fns';
import styles from './Topbar.module.css';

export default function Topbar({ onMenuToggle, title }) {
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLanguage, t } = useTranslation();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const loadNotifs = async () => {
    try {
      const data = await api.notifications.list();
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async () => {
    await api.notifications.markAllRead();
    setUnread(0);
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const translateMessage = (msg) => {
    if (locale !== 'ar') return msg;
    if (!msg) return msg;

    if (msg.startsWith('Your training site was visited and confirmed by ')) {
      const teacherName = msg.replace('Your training site was visited and confirmed by ', '').replace(/\.$/, '');
      return `تم زيارة موقع التدريب الخاص بك وتأكيده من قبل ${teacherName}.`;
    }
    if (msg === 'A supervisor teacher has been assigned to your training profile.' || msg === 'A teacher has been assigned to your profile.') {
      return 'تم تعيين مشرف أكاديمي لملف التدريب الخاص بك.';
    }
    if (msg === 'Welcome to the Pharmacy Training Management System! Complete your profile to get started.') {
      return 'مرحباً بك في نظام إدارة التدريب الصيدلاني! أكمل ملفك الشخصي للبدء.';
    }
    return msg;
  };

  const typeIcon = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌' };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuToggle}>☰</button>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <div className={styles.right}>
        <button className={styles.langBtn} onClick={toggleLanguage} title={locale === 'en' ? 'Translate to Arabic' : 'ترجمة إلى الإنجليزية'}>
          <span>🌐</span>
          <span>{locale === 'en' ? 'العربية' : 'EN'}</span>
        </button>
        <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className={styles.notifWrapper} ref={ref}>
          <button className={styles.iconBtn} onClick={() => { setOpen(!open); if (!open && unread > 0) markRead(); }}>
            🔔
            {unread > 0 && <span className={styles.badge}>{unread}</span>}
          </button>
          {open && (
            <div className={styles.dropdown}>
              <div className={styles.dropHeader}>
                <span>{t('notificationsTitle')}</span>
                {unread > 0 && <button onClick={markRead} className={styles.markBtn}>{t('markAllRead')}</button>}
              </div>
              <div className={styles.dropList}>
                {notifs.length === 0
                  ? <p className={styles.empty}>{t('noNotificationsYet')}</p>
                  : notifs.map(n => (
                    <div key={n._id} className={`${styles.notifItem} ${!n.isRead ? styles.unread : ''}`}>
                      <span className={styles.notifIcon}>{typeIcon[n.type] || 'ℹ️'}</span>
                      <div>
                        <p className={styles.notifMsg}>{translateMessage(n.message)}</p>
                        <p className={styles.notifTime}>{format(new Date(n.createdAt), 'dd MMM, HH:mm')}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
