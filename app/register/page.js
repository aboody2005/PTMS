'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import styles from '../auth.module.css';
import { api } from '@/utils/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const { locale, toggleLanguage, t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student', phone: '', gender: '', locationId: '' });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newLocationModal, setNewLocationModal] = useState(false);
  const [newLocForm, setNewLocForm] = useState({ name: '', city: '', region: '' });
  const [addingLoc, setAddingLoc] = useState(false);

  useEffect(() => {
    async function loadLocations() {
      try {
        const data = await api.locations.list();
        setLocations(data.locations || []);
      } catch (err) {
        console.error('Failed to fetch locations', err);
      }
    }
    loadLocations();
  }, []);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    if (!newLocForm.city || !newLocForm.region) {
      return toast.error(locale === 'ar' ? 'المدينة والمنطقة مطلوبة' : 'City and Region are required');
    }
    setAddingLoc(true);
    try {
      const data = await api.locations.create({
        name: newLocForm.region,
        city: newLocForm.city,
        region: newLocForm.region,
      });

      const newLoc = data.location;
      setLocations(prev => [...prev, newLoc]);
      setForm(prev => ({ ...prev, locationId: newLoc._id }));
      setNewLocationModal(false);
      setNewLocForm({ name: '', city: '', region: '' });
      toast.success(locale === 'ar' ? 'تم إنشاء موقع الصيدلية وتحديده بنجاح!' : 'Location created and selected!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingLoc(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.locationId) {
      return setError(locale === 'ar' ? 'يرجى تحديد موقع الصيدلية للتدريب' : 'Please select your Pharmacy Location');
    }
    if (form.password !== form.confirmPassword) {
      return setError(locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError(locale === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const user = await register(form);
      toast.success(locale === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'Account created successfully!');
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
      <div className={`${styles.authCard} ${styles.authCardWide}`}>
        <div className={styles.authHeader}>
          <Link href="/" className={styles.authLogo}>⚕️ {t('brandName')}</Link>
          <h1>{t('registerTitle')}</h1>
          <p>{t('registerSubtitle')}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2" style={{gap:16}}>
            <div className="form-group">
              <label className="form-label">{t('fullNameLabel')} *</label>
              <input className="form-control" placeholder={locale === 'ar' ? 'د. أحمد حسن' : 'Dr. Ahmed Hassan'} value={form.name} onChange={set('name')} required />
            </div>

            <div className="form-group">
              <label className="form-label">{t('emailLabel')} *</label>
              <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('phoneLabel')}</label>
              <input className="form-control" type="tel" placeholder="+964-770-..." value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('passwordLabel')} *</label>
              <div className="password-input-container">
                <input className="form-control" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} required />
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
            <div className="form-group">
              <label className="form-label">{t('confirmPasswordLabel')} *</label>
              <div className="password-input-container">
                <input className="form-control" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={form.confirmPassword} onChange={set('confirmPassword')} required />
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
            <div className="form-group">
              <label className="form-label">{t('genderLabel')}</label>
              <select className="form-control" value={form.gender} onChange={set('gender')}>
                <option value="">{t('genderSelect')}</option>
                <option value="male">{t('genderMale')}</option>
                <option value="female">{t('genderFemale')}</option>
                <option value="other">{t('genderOther')}</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{t('pharmacyLocationLabel')} *</label>
              <select className="form-control" value={form.locationId} onChange={set('locationId')} required>
                <option value="">{t('pharmacyLocationSelect')}</option>
                {locations.map(l => (
                  <option key={l._id} value={l._id}>{l.region || l.name} — {l.city}</option>
                ))}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setNewLocationModal(true)}>
                  ➕ {t('cantFindLocationBtn')}
                </button>
              </div>
            </div>
          </div>
          <button type="submit" className={`btn btn-primary w-full ${styles.submitBtn}`} disabled={loading}>
            {loading ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}} /> {locale === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating account...'}</> : (locale === 'ar' ? 'إنشاء الحساب ←' : 'Create Account →')}
          </button>
        </form>
        <p className={styles.authSwitch}>
          {t('alreadyHaveAccount')} <Link href="/login">{t('signInNow')}</Link>
        </p>
      </div>

      {newLocationModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setNewLocationModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h4>{t('addPharmacyLocation')}</h4>
              <button type="button" onClick={() => setNewLocationModal(false)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <form onSubmit={handleCreateLocation}>
              <div className="modal-body" style={{ display: 'block' }}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{t('cityLabel')} *</label>
                  <input className="form-control" placeholder={locale === 'ar' ? 'مثال: الموصل' : 'e.g. Mosul'} value={newLocForm.city}
                    onChange={e => setNewLocForm(p => ({ ...p, city: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{t('regionLabel')} *</label>
                  <input className="form-control" placeholder={locale === 'ar' ? 'مثال: الزهور' : 'e.g. Al-Zuhour'} value={newLocForm.region}
                    onChange={e => setNewLocForm(p => ({ ...p, region: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewLocationModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={addingLoc}>
                  {addingLoc ? (locale === 'ar' ? 'جاري الإضافة...' : 'Adding...') : t('addAndSelectBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
