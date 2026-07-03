'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const { locale, toggleLanguage, t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    phone: '',
    gender: '',
    locationId: '',
  });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newLocationModal, setNewLocationModal] = useState(false);
  const [newLocForm, setNewLocForm] = useState({ city: '', name: '' });
  const [addingLoc, setAddingLoc] = useState(false);

  // ── Name autocomplete ──────────────────────────────────────
  const [nameQuery, setNameQuery] = useState('');        // what user is typing
  const [nameConfirmed, setNameConfirmed] = useState(false); // picked from list
  const [suggestions, setSuggestions] = useState([]);   // search results
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);       // keyboard nav
  const nameRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimer = useRef(null);

  // Load locations via server-side API (works without auth)
  useEffect(() => {
    async function loadLocations() {
      setLocationsLoading(true);
      try {
        const res = await fetch('/api/locations');
        if (!res.ok) throw new Error('Failed to load locations');
        const data = await res.json();
        setLocations(data.locations || []);
      } catch (err) {
        console.error('Failed to fetch locations', err);
        toast.error(locale === 'ar' ? 'فشل تحميل المواقع' : 'Failed to load pharmacy locations');
      } finally {
        setLocationsLoading(false);
      }
    }
    loadLocations();
  }, [locale]);

  // ── Close dropdown on outside click ──────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        nameRef.current && !nameRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Debounced search ──────────────────────────────────────
  const searchNames = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/official-students/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setShowDropdown(true);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleNameTyping = (e) => {
    const val = e.target.value.replace(/[^\u0600-\u06FF\s]/g, '');
    setNameQuery(val);
    setNameConfirmed(false);
    setForm((p) => ({ ...p, name: '' })); // clear confirmed name
    clearTimeout(searchTimer.current);
    // Only search after the user has typed at least one full word (contains a space or >= 3 chars)
    const trimmed = val.trim();
    if (trimmed.length >= 3) {
      searchTimer.current = setTimeout(() => searchNames(trimmed), 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const selectSuggestion = (student) => {
    if (student.is_registered) {
      toast.error(
        locale === 'ar'
          ? 'هذا الاسم مسجّل مسبقاً. تواصل مع إدارة الجامعة.'
          : 'This name is already registered. Contact the university administration.',
        { duration: 4000 }
      );
      return;
    }
    setNameQuery(student.name);
    setForm((p) => ({ ...p, name: student.name }));
    setNameConfirmed(true);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIdx(-1);
  };

  const clearName = () => {
    setNameQuery('');
    setForm((p) => ({ ...p, name: '' }));
    setNameConfirmed(false);
    setSuggestions([]);
    setShowDropdown(false);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const handleNameKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        selectSuggestion(suggestions[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    if (!newLocForm.city || !newLocForm.name) {
      return toast.error(locale === 'ar' ? 'المدينة وموقع الصيدلية مطلوبان' : 'City and Pharmacy Location are required');
    }
    setAddingLoc(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: newLocForm.city,
          name: newLocForm.name,
          region: '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create location');

      const newLoc = data.location;
      setLocations((prev) => [...prev, newLoc]);
      setForm((prev) => ({ ...prev, locationId: newLoc.id || newLoc._id }));
      setNewLocationModal(false);
      setNewLocForm({ city: '', name: '' });
      toast.success(locale === 'ar' ? 'تم إنشاء موقع الصيدلية وتحديده بنجاح!' : 'Location created and selected!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingLoc(false);
    }
  };

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.locationId) {
      return setError(locale === 'ar' ? 'يرجى تحديد موقع الصيدلية للتدريب' : 'Please select your Pharmacy Location');
    }
    if (!form.phone) {
      return setError(locale === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required');
    }
    if (!/^07\d{9}$/.test(form.phone)) {
      return setError(locale === 'ar' ? 'رقم الهاتف يجب أن يبدأ بـ 07 ويتكون من 11 رقماً' : 'Phone must start with 07 and be 11 digits');
    }
    if (!nameConfirmed || !form.name) {
      return setError(locale === 'ar' ? 'يرجى اختيار اسمك من قائمة الطلبة الرسمية' : 'Please select your name from the official student list');
    }
    if (!form.email.toLowerCase().endsWith('@hu.edu.iq')) {
      return setError(locale === 'ar' ? 'البريد الإلكتروني يجب أن ينتهي بـ @hu.edu.iq' : 'Email must end with @hu.edu.iq');
    }
    if (form.password !== form.confirmPassword) {
      return setError(locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
    }
    if (form.password.length !== 8) {
      return setError(locale === 'ar' ? 'كلمة المرور يجب أن تتكون من 8 أرقام بالضبط' : 'Password must be exactly 8 characters');
    }

    setLoading(true);
    try {
      const user = await register(form);
      toast.success(locale === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'Account created successfully!');
      router.push(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">{t('fullNameLabel')} *</label>

              {/* Confirmed state — show locked badge */}
              {nameConfirmed ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(34,197,94,0.10)',
                  border: '1.5px solid #22c55e',
                  borderRadius: 10,
                  padding: '10px 14px',
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: '1.1rem' }}>✅</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', color: '#22c55e' }}>
                    {form.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearName}
                    title={locale === 'ar' ? 'تغيير الاسم' : 'Change name'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1,
                      padding: '2px 4px', borderRadius: 4,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                /* Typing state */
                <>
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={nameRef}
                      className="form-control"
                      placeholder={locale === 'ar' ? 'اكتب اسمك الأول للبحث...' : 'Type your first name to search...'}
                      value={nameQuery}
                      onChange={handleNameTyping}
                      onKeyDown={handleNameKeyDown}
                      onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                      autoComplete="off"
                      dir="rtl"
                    />
                    {searching && (
                      <span style={{
                        position: 'absolute',
                        [locale === 'ar' ? 'left' : 'right']: 12,
                        top: '50%', transform: 'translateY(-50%)',
                      }}>
                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      </span>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0, right: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--accent)',
                        borderRadius: 10,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                        zIndex: 200,
                        overflow: 'hidden',
                        maxHeight: 260,
                        overflowY: 'auto',
                      }}
                    >
                      {suggestions.length === 0 ? (
                        <div style={{
                          padding: '14px 16px',
                          color: 'var(--text-muted)',
                          fontSize: '0.85rem',
                          textAlign: 'center',
                          lineHeight: 1.6,
                        }}>
                          <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>🔍</div>
                          {locale === 'ar'
                            ? 'لا يوجد اسم مطابق في قائمة الطلبة الرسمية.'
                            : 'No matching name found in the official student list.'}
                        </div>
                      ) : (
                        suggestions.map((s, idx) => (
                          <div
                            key={s.id}
                            onMouseDown={() => selectSuggestion(s)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '11px 16px',
                              cursor: s.is_registered ? 'not-allowed' : 'pointer',
                              background: s.is_registered
                                ? 'rgba(239,68,68,0.04)'
                                : idx === activeIdx ? 'var(--accent-dim)' : 'transparent',
                              borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                              transition: 'background 0.12s',
                              direction: 'rtl',
                              opacity: s.is_registered ? 0.65 : 1,
                            }}
                            onMouseEnter={() => !s.is_registered && setActiveIdx(idx)}
                            onMouseLeave={() => setActiveIdx(-1)}
                          >
                            {/* Status dot */}
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              background: s.is_registered ? '#f87171' : '#22c55e',
                              boxShadow: s.is_registered ? '0 0 5px #f8717188' : '0 0 5px #22c55e88',
                            }} />
                            <span style={{
                              flex: 1, fontSize: '0.9rem', fontWeight: 500,
                              color: s.is_registered ? 'var(--text-muted)' : 'inherit',
                              textDecoration: s.is_registered ? 'line-through' : 'none',
                            }}>
                              {s.name}
                            </span>
                            {s.is_registered && (
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#f87171',
                                background: 'rgba(248,113,113,0.12)',
                                border: '1px solid rgba(248,113,113,0.3)',
                                borderRadius: 20,
                                padding: '1px 8px',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                🔒 {locale === 'ar' ? 'مسجّل مسبقاً' : 'Already registered'}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Hint */}
                  {nameQuery.trim().length > 0 && nameQuery.trim().length < 3 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 5, marginBottom: 0 }}>
                      {locale === 'ar' ? '💡 اكتب 3 أحرف على الأقل للبحث' : '💡 Type at least 3 characters to search'}
                    </p>
                  )}
                  {nameQuery.trim().length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 5, marginBottom: 0 }}>
                      {locale === 'ar'
                        ? '🔎 ابدأ بكتابة اسمك واختره من القائمة'
                        : '🔎 Start typing your name and select it from the list'}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('emailLabel')} *</label>
              <input
                className="form-control"
                type="email"
                placeholder="email@hu.edu.iq"
                value={form.email}
                onChange={(e) => {
                  // Strip anything that isn't a valid email ASCII character
                  const clean = e.target.value.replace(/[^a-zA-Z0-9@._%+\-]/g, '');
                  setForm((p) => ({ ...p, email: clean }));
                }}
                required
                style={{
                  borderColor: form.email && !form.email.toLowerCase().endsWith('@hu.edu.iq')
                    ? '#ef4444'
                    : undefined,
                }}
              />
              {form.email && !form.email.toLowerCase().endsWith('@hu.edu.iq') && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4, marginBottom: 0 }}>
                  {locale === 'ar'
                    ? '⚠ البريد يجب أن ينتهي بـ @hu.edu.iq'
                    : '⚠ Email must end with @hu.edu.iq'}
                </p>
              )}
              {form.email && form.email.toLowerCase().endsWith('@hu.edu.iq') && (
                <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: 4, marginBottom: 0 }}>
                  ✓ {locale === 'ar' ? 'بريد جامعي صالح' : 'Valid university email'}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('phoneLabel')} *</label>
              <input
                className="form-control"
                type="tel"
                placeholder="07XXXXXXXXX"
                value={form.phone}
                maxLength={11}
                required
                onChange={(e) => {
                  let val = e.target.value;
                  // Convert Arabic-Indic digits to Western digits
                  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                  for (let i = 0; i < 10; i++) {
                    val = val.replace(new RegExp(arabicDigits[i], 'g'), i);
                  }
                  // Strip non-digits and cap at 11
                  val = val.replace(/[^0-9]/g, '').slice(0, 11);
                  setForm((p) => ({ ...p, phone: val }));
                }}
                style={{
                  borderColor: form.phone && !form.phone.startsWith('07')
                    ? '#ef4444'
                    : undefined,
                }}
              />
              {form.phone && !form.phone.startsWith('07') && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4, marginBottom: 0 }}>
                  {locale === 'ar'
                    ? '⚠ رقم الهاتف يجب أن يبدأ بـ 07'
                    : '⚠ Phone number must start with 07'}
                </p>
              )}
              {form.phone && form.phone.startsWith('07') && form.phone.length < 11 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
                  {locale === 'ar'
                    ? `${11 - form.phone.length} رقم متبقٍ`
                    : `${11 - form.phone.length} digit(s) remaining`}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('genderLabel')}</label>
              <select className="form-control" value={form.gender} onChange={set('gender')}>
                <option value="">{t('genderSelect')}</option>
                <option value="male">{t('genderMale')}</option>
                <option value="female">{t('genderFemale')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('passwordLabel')} *</label>
              <div className="password-input-container">
                <input
                  className="form-control"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                  maxLength={8}
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
              {/* Live counter */}
              {form.password.length > 0 && form.password.length < 8 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
                  {locale === 'ar'
                    ? `${8 - form.password.length} أرقام متبقية`
                    : `${8 - form.password.length} character(s) remaining`}
                </p>
              )}

            </div>

            <div className="form-group">
              <label className="form-label">{t('confirmPasswordLabel')} *</label>
              <div className="password-input-container">
                <input
                  className="form-control"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  minLength={8}
                  maxLength={8}
                  required
                />
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

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{t('pharmacyLocationLabel')} *</label>
              <select
                className="form-control"
                value={form.locationId}
                onChange={set('locationId')}
                required
                disabled={locationsLoading}
              >
                <option value="">
                  {locationsLoading
                    ? (locale === 'ar' ? 'جاري تحميل المواقع...' : 'Loading locations...')
                    : t('pharmacyLocationSelect')}
                </option>
                {locations.map((l) => (
                  <option key={l.id || l._id} value={l.id || l._id}>
                    {l.city} — {l.region || l.name}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  onClick={() => setNewLocationModal(true)}
                >
                  ➕ {t('cantFindLocationBtn')}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary w-full ${styles.submitBtn}`}
            disabled={loading || locationsLoading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {locale === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating account...'}</>
            ) : (
              locale === 'ar' ? 'إنشاء الحساب ←' : 'Create Account →'
            )}
          </button>
        </form>

        <p className={styles.authSwitch}>
          {t('alreadyHaveAccount')} <Link href="/login">{t('signInNow')}</Link>
        </p>
      </div>

      {newLocationModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setNewLocationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h4>{t('addPharmacyLocation')}</h4>
              <button type="button" onClick={() => setNewLocationModal(false)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <form onSubmit={handleCreateLocation}>
              <div className="modal-body" style={{ display: 'block' }}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{t('cityLabel')} *</label>
                  <input
                    className="form-control"
                    placeholder={locale === 'ar' ? 'مثال: الموصل' : 'e.g. Mosul'}
                    value={newLocForm.city}
                    onChange={(e) => setNewLocForm((p) => ({ ...p, city: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{locale === 'ar' ? 'موقع الصيدلية (المنطقة / الحي)' : 'Pharmacy Location (Region / Area)'} *</label>
                  <input
                    className="form-control"
                    placeholder={locale === 'ar' ? 'مثال: حي المصارف' : 'e.g. Hai Al-Masaref'}
                    value={newLocForm.name}
                    onChange={(e) => setNewLocForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewLocationModal(false)}>
                  {t('cancel')}
                </button>
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
