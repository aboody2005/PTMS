'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import styles from '../auth.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { locale, toggleLanguage, t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(locale === 'ar' ? `مرحباً بك مجدداً، ${user.name}!` : `Welcome back, ${user.name}!`);
      router.push(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.authWrapper}>
      <div style={{ position: 'fixed', top: 20, [locale === 'ar' ? 'left' : 'right']: 20, zIndex: 100 }}>
        <button onClick={toggleLanguage} className="auth-lang-btn">
          <span>🌐</span>
          <span>{locale === 'en' ? 'العربية' : 'EN'}</span>
        </button>
      </div>

      <div className={styles.authGlow} />
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link href="/" className={styles.authLogo}>⚕️ {t('brandName')}</Link>
          <h1>{t('loginTitle')}</h1>
          <p>{t('loginSubtitle')}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('emailLabel')}</label>
            <input
              className="form-control"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('passwordLabel')}</label>
            <div className="password-input-container">
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className={styles.forgotRow}>
            <Link href="/forgot-password" className={styles.forgotLink}>{t('forgotPasswordLink')}</Link>
          </div>
          <button
            type="submit"
            className={`btn btn-primary w-full ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {locale === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</>
              : (locale === 'ar' ? 'تسجيل الدخول ←' : 'Sign In →')}
          </button>
        </form>

        <p className={styles.authSwitch}>
          {t('dontHaveAccount')} <Link href="/register">{t('signUpNow')}</Link>
        </p>
      </div>
    </div>
  );
}
