'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import LocationPicker from '@/components/LocationPicker';
import { useTranslation } from '@/context/LanguageContext';
import toast from 'react-hot-toast';

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const { locale, t } = useTranslation();
  const [student, setStudent] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', gender: '', profileImage: '', password: '', confirmPassword: '' });
  const [studentForm, setStudentForm] = useState({ university: '', pharmacyName: '', startDate: '', endDate: '', locationId: '', latitude: null, longitude: null });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newLocationModal, setNewLocationModal] = useState(false);
  const [newLocForm, setNewLocForm] = useState({ name: '', city: '', region: '' });
  const [addingLoc, setAddingLoc] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, lRes] = await Promise.all([api.students.my(), api.locations.list()]);
        const s = sRes.student;
        setStudent(s);
        setLocations(lRes.locations || []);
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
    if (file.size > 2 * 1024 * 1024) {
      return toast.error(locale === 'ar' ? 'يجب أن يكون حجم الصورة أقل من 2 ميغابايت' : 'Image must be under 2MB');
    }
    const reader = new FileReader();
    reader.onload = (ev) => setUserForm(p => ({ ...p, profileImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleMapChange = ({ lat, lng }) => {
    setStudentForm(p => ({ ...p, latitude: lat, longitude: lng }));
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
              { label: t('phoneLabel'), key: 'phone', type: 'tel', placeholder: '+964-770-...' },
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
                      onChange={e => setUserForm(p => ({ ...p, [key]: e.target.value }))} />
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
                <option value="other">{t('genderOther')}</option>
              </select>
            </div>
          </div>

          {/* Training Info */}
          <div className="card">
            <div className="card-header"><h4 className="card-title">🎓 {t('trainingInfo')}</h4></div>
            <div className="form-group">
              <label className="form-label">{t('universityLabel')}</label>
              <input className="form-control" value="جامعة الحدباء" disabled />
            </div>
            <div className="form-group">
              <label className="form-label">{t('pharmacyNameLabel')}</label>
              <input className="form-control" placeholder={locale === 'ar' ? 'مثال: صيدلية النور' : 'e.g. Al-Nour Pharmacy'} value={studentForm.pharmacyName}
                onChange={e => setStudentForm(p => ({ ...p, pharmacyName: e.target.value }))} />
            </div>
            <div className="grid grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">{t('startDateLabel')}</label>
                <input className="form-control" type="date" value={studentForm.startDate}
                  onChange={e => setStudentForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('endDateLabel')}</label>
                <input className="form-control" type="date" value={studentForm.endDate} disabled />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('pharmacyLocationLabel')}</label>
              <select className="form-control" value={studentForm.locationId}
                onChange={e => setStudentForm(p => ({ ...p, locationId: e.target.value }))}>
                <option value="">{locale === 'ar' ? 'اختر الموقع...' : 'Select location...'}</option>
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

          {/* Map */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h4 className="card-title">🗺️ {t('gpsLocation')}</h4></div>
            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>{t('gpsHint')}</p>
            <LocationPicker lat={studentForm.latitude} lng={studentForm.longitude} onChange={handleMapChange} />
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
    </div>
  );
}
