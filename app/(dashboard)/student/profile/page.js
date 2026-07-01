'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import LocationPicker from '@/components/LocationPicker';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';
import ImageCropperModal from '@/components/ImageCropperModal';

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const { locale, t } = useTranslation();
  const [student, setStudent] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [cropperSrc, setCropperSrc] = useState(null);
  const fileRef = useRef();

  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', gender: '', profileImage: '', password: '', confirmPassword: '' });
  const [studentForm, setStudentForm] = useState({ university: '', pharmacyName: '', startDate: '', endDate: '', locationId: '', latitude: null, longitude: null, attendanceStart: '', attendanceEnd: '', trainingDays: [] });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newLocationModal, setNewLocationModal] = useState(false);
  const [newLocForm, setNewLocForm] = useState({ name: '', city: '', region: '' });
  const [addingLoc, setAddingLoc] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, lRes, lockRes] = await Promise.all([
          api.students.my(),
          api.locations.list(),
          api.students.getLockStudentEdits().catch(() => ({ lockStudentEdits: false }))
        ]);
        const s = sRes.student;
        setStudent(s);
        setLocations(lRes.locations || []);
        setIsLocked(lockRes?.lockStudentEdits || false);
        setUserForm({
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          gender: user?.gender || '',
          profileImage: user?.profileImage || '',
          password: '',
          confirmPassword: '',
        });
        setStudentForm({
          university: 'جامعة الحدباء', pharmacyName: s.pharmacyName || '',
          startDate: s.startDate ? s.startDate.split('T')[0] : '',
          endDate: s.endDate ? s.endDate.split('T')[0] : '',
          locationId: s.locationId?._id || '', latitude: s.latitude, longitude: s.longitude,
          attendanceStart: s.attendanceStart || '',
          attendanceEnd: s.attendanceEnd || '',
          trainingDays: Array.isArray(s.trainingDays) ? s.trainingDays : [],
        });
      } catch {
        toast.error(locale === 'ar' ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile');
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    if (!newLocForm.city || !newLocForm.region) {
      return toast.error(locale === 'ar' ? 'المدينة والمنطقة مطلوبة' : 'City and Region are required');
    }
    setAddingLoc(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocForm.region,
          city: newLocForm.city,
          region: newLocForm.region,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create location');

      const newLoc = data.location;
      setLocations(prev => [...prev, newLoc]);
      setStudentForm(prev => ({ ...prev, locationId: newLoc._id }));
      setNewLocationModal(false);
      setNewLocForm({ name: '', city: '', region: '' });
      toast.success(locale === 'ar' ? 'تم إنشاء موقع الصيدلية وتحديده بنجاح!' : 'Location created and selected!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingLoc(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return toast.error(locale === 'ar' ? 'يجب أن يكون حجم الصورة أقل من 10 ميغابايت' : 'Image must be under 10MB');
    }
    const reader = new FileReader();
    reader.onload = (ev) => setCropperSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleMapChange = ({ lat, lng }) => {
    setStudentForm(p => ({ ...p, latitude: lat, longitude: lng }));
  };

  const getTrainingMonthValue = () => {
    if (!studentForm.startDate) return '';
    if (studentForm.startDate.includes('-07-') || studentForm.startDate.endsWith('-07-01')) return 'july';
    if (studentForm.startDate.includes('-08-') || studentForm.startDate.endsWith('-08-01')) return 'august';
    try {
      const date = new Date(studentForm.startDate);
      const month = date.getMonth();
      if (month === 6) return 'july';
      if (month === 7) return 'august';
    } catch {}
    return '';
  };

  const handleTrainingMonthChange = (e) => {
    const val = e.target.value;
    const year = studentForm.startDate ? new Date(studentForm.startDate).getFullYear() : 2026;
    if (val === 'july') {
      setStudentForm(p => ({
        ...p,
        startDate: `${year}-07-01`,
        endDate: `${year}-07-31`
      }));
    } else if (val === 'august') {
      setStudentForm(p => ({
        ...p,
        startDate: `${year}-08-01`,
        endDate: `${year}-08-31`
      }));
    } else {
      setStudentForm(p => ({
        ...p,
        startDate: '',
        endDate: ''
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (userForm.password) {
      if (userForm.password !== userForm.confirmPassword) {
        return toast.error(locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      }
      if (userForm.password.length < 6) {
        return toast.error(locale === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      }
    }
    setSaving(true);
    try {
      const finalStudentForm = { ...studentForm, university: 'جامعة الحدباء' };
      const userUpdatePayload = { ...userForm };
      if (!userForm.password) {
        delete userUpdatePayload.password;
      }
      delete userUpdatePayload.confirmPassword;

      await api.users.update(user._id, userUpdatePayload);
      await api.students.update(student._id, finalStudentForm);
      updateUser(userUpdatePayload);
      setUserForm(p => ({ ...p, password: '', confirmPassword: '' }));
      toast.success(locale === 'ar' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profile updated successfully!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex-center" style={{height:300}}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>{t('myProfile')}</h1>
        <p className="text-muted">{locale === 'ar' ? 'تحديث معلوماتك الشخصية والتدريبية' : 'Update your personal and training information'}</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-2" style={{ gap: 24 }}>
          {/* Personal Info */}
          <div className="card">
            <div className="card-header"><h4 className="card-title">👤 {t('personalInfo')}</h4></div>

            {/* Avatar upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: 'var(--accent)', border: '2px solid var(--border)', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => fileRef.current.click()}>
                {userForm.profileImage
                  ? <img src={userForm.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>{t('changePhoto')}</button>
                <p className="text-xs text-muted" style={{ marginTop: 6 }}>{t('photoHint')}</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>

            {[
              { label: t('fullNameLabel'), key: 'name', type: 'text', placeholder: locale === 'ar' ? 'الاسم الكامل' : 'Your full name' },
              { label: t('emailLabel'), key: 'email', type: 'email', placeholder: 'your.email@example.com' },
              {label: t('phoneLabel'), key: 'phone', type: 'tel', placeholder: '07XXXXXXXXX'},
              { label: locale === 'ar' ? 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالحالية)' : 'New Password (leave blank to keep current)', key: 'password', type: 'password', placeholder: '••••••••' },
              { label: t('confirmPasswordLabel'), key: 'confirmPassword', type: 'password', placeholder: '••••••••' },
            ].map(({ label, key, type, placeholder }) => {
              const isPasswordType = key === 'password' || key === 'confirmPassword';
              const isShowing = key === 'password' ? showPassword : showConfirmPassword;
              const toggleShow = key === 'password' ? () => setShowPassword(!showPassword) : () => setShowConfirmPassword(!showConfirmPassword);

              return (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  {isPasswordType ? (
                    <div className="password-input-container">
                      <input className="form-control" type={isShowing ? 'text' : 'password'} placeholder={placeholder} value={userForm[key] || ''}
                        onChange={e => setUserForm(p => ({ ...p, [key]: e.target.value }))} />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={toggleShow}
                        aria-label={isShowing ? 'Hide password' : 'Show password'}
                      >
                        {isShowing ? (
                          <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    <input className="form-control" type={type} placeholder={placeholder} value={userForm[key] || ''}
                      onChange={e => {
                        let val = e.target.value;
                        if (key === 'phone') {
                          const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                          for (let i = 0; i < 10; i++) {
                            val = val.replace(new RegExp(arabicDigits[i], 'g'), i);
                          }
                          val = val.replace(/[^0-9]/g, '');
                        }
                        setUserForm(p => ({ ...p, [key]: val }));
                      }} />
                  )}
                </div>
              );
            })}

            <div className="form-group">
              <label className="form-label">{t('genderLabel')}</label>
              <select className="form-control" value={userForm.gender} onChange={e => setUserForm(p => ({ ...p, gender: e.target.value }))}>
                <option value="">{locale === 'ar' ? 'اختر الجنس' : 'Select'}</option>
                <option value="male">{t('genderMale')}</option>
                <option value="female">{t('genderFemale')}</option>
              </select>
            </div>
          </div>

          {/* Training Info */}
          <div className="card">
            <div className="card-header"><h4 className="card-title">🎓 {t('trainingInfo')}</h4></div>
            
            {isLocked && (
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #fee2e2',
                background: '#fef2f2',
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>🔒</span>
                <span>
                  {locale === 'ar'
                    ? 'تم إيقاف تعديل بيانات التدريب من قبل الإدارة.'
                    : 'Editing training details is locked by the admin.'}
                </span>
              </div>
            )}


            
            <div className="form-group">
              <label className="form-label">{t('pharmacyNameLabel')}</label>
              <input className="form-control" placeholder={locale === 'ar' ? 'مثال: صيدلية النور' : 'e.g. Al-Nour Pharmacy'} value={studentForm.pharmacyName}
                onChange={e => setStudentForm(p => ({ ...p, pharmacyName: e.target.value }))} disabled={isLocked} />
            </div>

            <div className="form-group">
              <label className="form-label">{locale === 'ar' ? 'شهر التدريب' : 'Month of Training'}</label>
              <select
                className="form-control"
                value={getTrainingMonthValue()}
                onChange={handleTrainingMonthChange}
                disabled={isLocked}
              >
                <option value="">{locale === 'ar' ? 'اختر شهر التدريب...' : 'Select training month...'}</option>
                <option value="july">{locale === 'ar' ? 'شهر السابع' : 'July'}</option>
                <option value="august">{locale === 'ar' ? 'شهر الثامن' : 'August'}</option>
              </select>
            </div>

            {/* Training Days */}
            <div className="form-group">
              <label className="form-label">
                {locale === 'ar' ? 'أيام التدريب' : 'Training Days'}
              </label>
              {(() => {
                const allDays = [
                  { key: 'sunday',    ar: 'الأحد',     en: 'Sun' },
                  { key: 'monday',    ar: 'الاثنين',   en: 'Mon' },
                  { key: 'tuesday',   ar: 'الثلاثاء',  en: 'Tue' },
                  { key: 'wednesday', ar: 'الأربعاء',  en: 'Wed' },
                  { key: 'thursday',  ar: 'الخميس',    en: 'Thu' },
                  { key: 'friday',    ar: 'الجمعة',    en: 'Fri' },
                  { key: 'saturday',  ar: 'السبت',     en: 'Sat' },
                ];
                const toggle = (key) => {
                  setStudentForm(p => ({
                    ...p,
                    trainingDays: p.trainingDays.includes(key)
                      ? p.trainingDays.filter(d => d !== key)
                      : [...p.trainingDays, key],
                  }));
                };
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {allDays.map(({ key, ar, en }) => {
                      const selected = studentForm.trainingDays.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={isLocked}
                          onClick={() => toggle(key)}
                          style={{
                            padding: '7px 16px',
                            borderRadius: 22,
                            border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            background: selected ? 'var(--accent-dim)' : 'transparent',
                            color: selected ? 'var(--accent)' : 'var(--text-muted)',
                            fontWeight: selected ? 700 : 400,
                            fontSize: '0.86rem',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            transition: 'all 0.18s ease',
                            opacity: isLocked ? 0.6 : 1,
                          }}
                        >
                          {locale === 'ar' ? ar : en}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Attendance Time */}
            {(() => {
              const timeSlots = [
                { value: '07:00', label: '7:00 صباحًا' },
                { value: '08:00', label: '8:00 صباحًا' },
                { value: '09:00', label: '9:00 صباحًا' },
                { value: '10:00', label: '10:00 صباحًا' },
                { value: '11:00', label: '11:00 صباحًا' },
                { value: '12:00', label: '12:00 ظهرًا' },
                { value: '13:00', label: '1:00 مساءً' },
                { value: '14:00', label: '2:00 مساءً' },
                { value: '15:00', label: '3:00 مساءً' },
                { value: '16:00', label: '4:00 مساءً' },
                { value: '17:00', label: '5:00 مساءً' },
                { value: '18:00', label: '6:00 مساءً' },
                { value: '19:00', label: '7:00 مساءً' },
                { value: '20:00', label: '8:00 مساءً' },
                { value: '21:00', label: '9:00 مساءً' },
                { value: '22:00', label: '10:00 مساءً' },
                { value: '23:00', label: '11:00 مساءً' },
                { value: '00:00', label: '12:00 منتصف الليل' },
              ];
              return (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>
                    🕐 {locale === 'ar' ? 'وقت التواجد في الصيدلية' : 'Pharmacy Attendance Hours'}
                  </label>
                  <div className="grid grid-2" style={{ gap: 12 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        {locale === 'ar' ? 'وقت بداية التواجد' : 'Start Time'}
                      </label>
                      <select
                        className="form-control"
                        value={studentForm.attendanceStart}
                        disabled={isLocked}
                        onChange={e => {
                          const newStart = e.target.value;
                          setStudentForm(p => ({
                            ...p,
                            attendanceStart: newStart,
                            // clear end time if it is no longer strictly greater than the new start
                            attendanceEnd: p.attendanceEnd && newStart && p.attendanceEnd <= newStart ? '' : p.attendanceEnd,
                          }));
                        }}
                      >
                        <option value="">{locale === 'ar' ? 'اختر وقت البداية' : 'Select start time'}</option>
                        {timeSlots
                          .filter(ts => !studentForm.attendanceEnd || ts.value !== studentForm.attendanceEnd)
                          .map(ts => (
                            <option key={ts.value} value={ts.value}>{ts.label}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        {locale === 'ar' ? 'وقت انتهاء التواجد' : 'End Time'}
                      </label>
                      <select
                        className="form-control"
                        value={studentForm.attendanceEnd}
                        disabled={isLocked}
                        onChange={e => setStudentForm(p => ({ ...p, attendanceEnd: e.target.value }))}
                      >
                        <option value="">{locale === 'ar' ? 'اختر وقت الانتهاء' : 'Select end time'}</option>
                        {timeSlots
                          .filter(ts => {
                            // Must be strictly greater than start time
                            if (studentForm.attendanceStart && ts.value <= studentForm.attendanceStart) return false;
                            return true;
                          })
                          .map(ts => (
                            <option key={ts.value} value={ts.value}>{ts.label}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })()}



            <div className="form-group">
              <label className="form-label">{t('pharmacyLocationLabel')}</label>
              <select className="form-control" value={studentForm.locationId}
                onChange={e => setStudentForm(p => ({ ...p, locationId: e.target.value }))} disabled={isLocked}>
                <option value="">{locale === 'ar' ? 'اختر الموقع...' : 'Select location...'}</option>
                {locations.map(l => (
                  <option key={l._id} value={l._id}>{l.city} — {l.region || l.name}</option>
                ))}
              </select>
              {!isLocked && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setNewLocationModal(true)}>
                    ➕ {t('cantFindLocationBtn')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h4 className="card-title">🗺️ {t('gpsLocation')}</h4></div>
            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>{t('gpsHint')}</p>
            <LocationPicker lat={studentForm.latitude} lng={studentForm.longitude} onChange={handleMapChange} disabled={isLocked} />
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}} /> {t('saving')}</> : `💾 ${t('saveProfile')}`}
          </button>
        </div>
      </form>

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
      {cropperSrc && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          locale={locale}
          onClose={() => setCropperSrc(null)}
          onCrop={(croppedDataUrl) => {
            setUserForm(p => ({ ...p, profileImage: croppedDataUrl }));
            setCropperSrc(null);
          }}
        />
      )}
    </div>
  );
}
