'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const { locale, toggleLanguage, t } = useTranslation();
  const [step, setStep] = useState(1); // 1=email, 2=reset token shown, 3=new password
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.auth.forgotPassword({ email });
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const doReset = async (e) => {
    e.preventDefault(); setError('');
    if (newPassword.length < 6) {
      return setError(locale === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
    }
    if (newPassword !== confirm) {
      return setError(locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
    }
    setLoading(true);
    try {
      await api.auth.resetPassword({ token, password: newPassword });
      setSuccess(locale === 'ar' ? 'تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.' : 'Password reset successfully! You can now sign in.');
      setStep(4);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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
          <h1>{locale === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}</h1>
          <p>{locale === 'ar' ? 'سنقوم بتوليد رمز إعادة تعيين لك' : "We'll generate a reset token for you"}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 1 && (
          <form onSubmit={requestReset}>
            <div className="form-group">
              <label className="form-label">{t('emailLabel')}</label>
              <input className="form-control" type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className={`btn btn-primary w-full ${styles.submitBtn}`} disabled={loading}>
              {loading
                ? (locale === 'ar' ? 'جاري التوليد...' : 'Generating...')
                : (locale === 'ar' ? 'توليد رمز إعادة التعيين ←' : 'Generate Reset Token →')}
            </button>
          </form>
        )}

        {step === 2 && (
          <div>
            <div className="alert alert-info" style={{marginBottom:20}}>
              {locale === 'ar' 
                ? 'ℹ️ إذا كان البريد الإلكتروني مسجلاً، فقد تم توليد الرمز بنجاح. يرجى مراجعة المسؤول عن التدريب (الأدمن) للحصول على الرمز لتتمكن من إعادة تعيين كلمة المرور.' 
                : 'ℹ️ If the email is registered, a reset token has been successfully generated. Please contact your training administrator (Admin) to retrieve the token and reset your password.'}
            </div>
            <button className="btn btn-primary w-full" onClick={() => setStep(3)}>
              {locale === 'ar' ? 'لدي الرمز — إعادة تعيين كلمة المرور ←' : 'I have the token — Reset Password →'}
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={doReset}>
            <div className="form-group">
              <label className="form-label">{locale === 'ar' ? 'رمز إعادة التعيين' : 'Reset Token'}</label>
              <input className="form-control" value={token} onChange={e => setToken(e.target.value)} placeholder={locale === 'ar' ? 'أدخل الرمز هنا' : 'Paste token here'} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('newPasswordLabel')}</label>
              <div className="password-input-container">
                <input className="form-control" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? (
                    <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('confirmPasswordLabel')}</label>
              <div className="password-input-container">
                <input className="form-control" type={showConfirmPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className={`btn btn-primary w-full ${styles.submitBtn}`} disabled={loading}>
              {loading
                ? (locale === 'ar' ? 'جاري إعادة التعيين...' : 'Resetting...')
                : (locale === 'ar' ? 'إعادة تعيين كلمة المرور ←' : 'Reset Password →')}
            </button>
          </form>
        )}

        {step === 4 && (
          <Link href="/login" className="btn btn-primary w-full" style={{textAlign:'center',marginTop:8}}>
            {locale === 'ar' ? 'الذهاب إلى صفحة تسجيل الدخول ←' : 'Go to Login →'}
          </Link>
        )}

        <p className={styles.authSwitch}>
          {locale === 'ar' ? 'هل تتذكر كلمة المرور؟' : 'Remember your password?'}{' '}
          <Link href="/login">{t('signInNow')}</Link>
        </p>
      </div>
    </div>
  );
}
