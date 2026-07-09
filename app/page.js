'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/context/LanguageContext';
import styles from './home.module.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLanguage, t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Typewriter effect for Developer Card
  const roles = ['Representative of Students', 'Full Stack Developer', 'Designer'];
  const [roleIndex, setRoleIndex] = useState(0);
  const [currentRoleText, setCurrentRoleText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer;
    const activeRole = roles[roleIndex];
    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentRoleText(prev => prev.slice(0, -1));
      }, 50);
    } else {
      timer = setTimeout(() => {
        setCurrentRoleText(activeRole.slice(0, currentRoleText.length + 1));
      }, 100);
    }

    if (!isDeleting && currentRoleText === activeRole) {
      timer = setTimeout(() => setIsDeleting(true), 1500);
    } else if (isDeleting && currentRoleText === '') {
      setIsDeleting(false);
      setRoleIndex(prev => (prev + 1) % roles.length);
    }
    return () => clearTimeout(timer);
  }, [currentRoleText, isDeleting, roleIndex]);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const features = [
    { icon: '🎓', title: t('featureStudentProfile'), desc: t('featureStudentProfileDesc') },
    { icon: '👨‍🏫', title: t('featureSupervisor'), desc: t('featureSupervisorDesc') },
    { icon: '🗺️', title: t('featureGpsLocation'), desc: t('featureGpsLocationDesc') },
    { icon: '📊', title: t('featureAdminPanel'), desc: t('featureAdminPanelDesc') },
    { icon: '🔔', title: t('featureTitle'), desc: t('heroSubtitle') },
  ];

  return (
    <div className={styles.wrapper}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>⚕️</span>
            <span>{t('brandName')}</span>
          </Link>
          <div className={`${styles.navLinks} ${menuOpen ? styles.open : ''}`}>
            <a href="#about" onClick={() => setMenuOpen(false)}>{t('navAbout')}</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>{t('navFeatures')}</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>{t('navContact')}</a>
            <div className={styles.mobileNavBtns}>
              <Link href="/login" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>{t('navLogin')}</Link>
              <Link href="/register" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>{t('navRegister')}</Link>
            </div>
          </div>
          <div className={styles.navActions}>
            <button className={styles.langBtnHome} onClick={toggleLanguage} title={locale === 'en' ? 'Translate to Arabic' : 'ترجمة إلى الإنجليزية'}>
              <span>🌐</span>
              <span>{locale === 'en' ? 'العربية' : 'EN'}</span>
            </button>
            <button className={styles.themeBtn} onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className={styles.desktopNavBtns}>
              <Link href="/login" className="btn btn-secondary btn-sm">{t('navLogin')}</Link>
              <Link href="/register" className="btn btn-primary btn-sm">{t('navRegister')}</Link>
            </div>
            <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {locale === 'ar' ? (
              <>
                {t('brandDesc')}<br />
                <span className={styles.accent}>{t('brandName')}</span>
              </>
            ) : (
              <>
                Pharmacy Training<br />
                <span className={styles.accent}>Management System</span>
              </>
            )}
          </h1>
          <p className={styles.heroDesc}>
            {t('heroSubtitle')}
          </p>
          <div className={styles.heroBtns}>
            <Link href="/register" className="btn btn-primary btn-lg">{t('getStarted')} →</Link>
            <Link href="/login" className="btn btn-secondary btn-lg">{t('navLogin')}</Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={`${styles.section} ${styles.aboutSection}`}>
        <div className={styles.sectionInner}>
          <h2>{t('aboutTitle')}</h2>
          <p className={styles.sectionDesc}>
            {t('aboutText1')}
          </p>
          <p className={styles.sectionDesc} style={{ marginTop: 16 }}>
            {t('aboutText2')}
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <h2>{t('featureTitle')}</h2>
          <div className={`grid grid-3 ${styles.featGrid}`} style={{ marginTop: 40 }}>
            {features.map(({ icon, title, desc }, idx) => (
              <div key={idx} className={styles.featCard}>
                <div className={styles.featIcon}>{icon}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.section}>
        <div className={styles.sectionInner} style={{ maxWidth: 600, textAlign: 'center' }}>
          <h2>{t('contactTitle')}</h2>
          <p className={styles.sectionDesc}>{t('contactSubtitle')}</p>

          {/* Developer Card */}
          <div className={styles.devCard}>
            <div className={styles.devAvatarContainer}>
              <img src="/developer-avatar.png" alt="Abdulrahman Abdulsattar" className={styles.devAvatar} />
            </div>
            <h3 className={styles.devName}>Abdulrahman Abdulsattar</h3>
            <div className={styles.typingContainer}>
              <span>{currentRoleText}</span>
              <span className={styles.typingCursor}>|</span>
            </div>
            <div className={styles.socialButtons}>
              <a href="https://t.me/aboody_dev" target="_blank" rel="noopener noreferrer" className={styles.socialBtn} title="Telegram">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 7.99-3.44 3.81-1.59 4.6-1.87 5.12-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.2-.04.28z" />
                </svg>
              </a>
              <a href="https://instagram.com/1_xf3" target="_blank" rel="noopener noreferrer" className={styles.socialBtn} title="Instagram">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span>⚕️</span> {t('brandName')}
          </div>
          <p>© {new Date().getFullYear()} {t('brandDesc')}. {t('allRightsReserved')}</p>
          <div className={styles.footerLinks}>
            <Link href="/login">{t('navLogin')}</Link>
            <Link href="/register">{t('navRegister')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
