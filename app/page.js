'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import styles from './home.module.css';

export default function HomePage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLanguage, t } = useTranslation();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (user) router.push(`/${user.role}/dashboard`);
  }, [user, router]);

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
          <div className={styles.heroBadge}>🇮🇶 {t('iraqGov')}</div>
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
          <div className={styles.heroStats}>
            <div><strong>3</strong><span>{t('roleAdmin')} & {t('roleTeacher')} & {t('roleStudent')}</span></div>
            <div><strong>GPS</strong><span>{t('featureGpsLocation')}</span></div>
            <div><strong>PDF</strong><span>{t('sideReports')}</span></div>
            <div><strong>Real-time</strong><span>{t('featureTitle')}</span></div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionTag}>{t('aboutTitle')}</div>
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
          <div className={styles.sectionTag}>{t('navFeatures')}</div>
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
          <div className={styles.sectionTag}>{t('navContact')}</div>
          <h2>{t('contactTitle')}</h2>
          <p className={styles.sectionDesc}>{t('contactSubtitle')}</p>
          <div className={styles.contactGrid}>
            <div className={styles.contactItem}><span>📧</span><p>admin@ptms.com</p></div>
            <div className={styles.contactItem}><span>🏥</span><p>{t('iraqGov')}</p></div>
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
