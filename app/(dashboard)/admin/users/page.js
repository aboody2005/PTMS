'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTranslation } from '@/context/LanguageContext';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'student', phone: '', gender: '' };

export default function AdminUsers() {
  const { locale, t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [tokenModal, setTokenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeToken, setActiveToken] = useState('');
  const [activeTokenExpiry, setActiveTokenExpiry] = useState('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const openTokenModal = (u) => {
    setSelectedUser(u);
    setActiveToken(u.resetToken || '');
    setActiveTokenExpiry(u.resetTokenExpiry || '');
    setTokenModal(true);
  };

  const handleGenerateToken = async () => {
    if (!selectedUser) return;
    setGeneratingToken(true);
    try {
      const data = await api.users.generateResetToken(selectedUser._id);
      setActiveToken(data.resetToken);
      setActiveTokenExpiry(data.resetTokenExpiry);
      toast.success('Reset token generated!');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to generate token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const data = await api.users.list(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      return toast.error(locale === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await api.users.create(form);
      toast.success(locale === 'ar' ? 'تم إنشاء المستخدم بنجاح!' : 'User created successfully!');
      setModal(false); setForm(EMPTY_FORM); setShowCreatePassword(false); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(locale === 'ar' ? `هل أنت متأكد من حذف المستخدم "${name}" وكل بياناته نهائياً؟ لا يمكن التراجع عن هذا الإجراء.` : `Permanently delete "${name}" and all their data? This cannot be undone.`)) return;
    setDeleting(id);
    try { await api.users.delete(id); toast.success(locale === 'ar' ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully'); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(null); }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div className="page-header flex-between" style={{flexWrap:'wrap',gap:12}}>
        <div><h1>{t('userMgmt')}</h1><p className="text-muted">{locale === 'ar' ? `إجمالي المستخدمين: ${total}` : `${total} total users`}</p></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>{t('addUser')}</button>
      </div>

      {/* Search & filter */}
      <form onSubmit={handleSearch} style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div className="search-bar" style={{flex:1,minWidth:200}}>
          <span className="search-icon">🔍</span>
          <input className="form-control" placeholder={locale === 'ar' ? 'البحث بالاسم...' : 'Search by name...'} value={search}
            onChange={e => setSearch(e.target.value)} style={{paddingLeft:36}} />
        </div>
        <select className="form-control" style={{width:160}} value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">{t('roleFilter')}</option>
          <option value="student">{locale === 'ar' ? 'طالب' : 'Student'}</option>
          <option value="teacher">{locale === 'ar' ? 'مشرف أكاديمي' : 'Teacher'}</option>
          <option value="admin">{locale === 'ar' ? 'مدير النظام' : 'Admin'}</option>
        </select>
        <button type="submit" className="btn btn-secondary">{locale === 'ar' ? 'بحث' : 'Search'}</button>
      </form>

      {loading ? <div className="flex-center" style={{height:200}}><div className="spinner" /></div> : (
        <>
          <div className="table-wrapper card" style={{padding:0}}>
            <table>
              <thead>
                <tr>
                  <th>{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th>{t('emailLabel')}</th>
                  <th>{locale === 'ar' ? 'الدور' : 'Role'}</th>
                  <th>{locale === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th>{locale === 'ar' ? 'الجنس' : 'Gender'}</th>
                  <th>{locale === 'ar' ? 'تاريخ الانضمام' : 'Joined'}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0
                  ? <tr><td colSpan={7} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>{locale === 'ar' ? 'لم يتم العثور على مستخدمين.' : 'No users found.'}</td></tr>
                  : users.map(u => (
                    <tr key={u._id}>
                      <td style={{fontWeight:600,fontSize:'0.875rem'}}>{u.name}</td>
                      <td className="text-sm">
                        <div>{u.email}</div>
                        {u.resetToken && new Date(u.resetTokenExpiry) > new Date() && (
                          <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px', marginTop: 4, display: 'inline-block' }}>
                            {locale === 'ar' ? '🔑 رمز نشط' : '🔑 Active Token'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${u.role==='admin'?'error':u.role==='teacher'?'info':'success'}`}>
                          {u.role === 'admin' ? t('roleAdmin') : u.role === 'teacher' ? t('roleTeacher') : t('roleStudent')}
                        </span>
                      </td>
                      <td className="text-sm text-muted">{u.phone || '—'}</td>
                      <td className="text-sm text-muted">
                        {u.gender === 'male' ? t('genderMale') : u.gender === 'female' ? t('genderFemale') : u.gender || '—'}
                      </td>
                      <td className="text-xs text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openTokenModal(u)} style={{ marginRight: 8, marginLeft: 8 }}>
                          {locale === 'ar' ? '🔑 الرمز' : '🔑 Token'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id, u.name)} disabled={deleting === u._id}>
                          {deleting === u._id ? '...' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)}>
              {locale === 'ar' ? 'السابق →' : '← Prev'}
            </button>
            {(() => {
              const pages = [];
              const delta = 2;
              const left = Math.max(2, page - delta);
              const right = Math.min(totalPages - 1, page + delta);
              pages.push(1);
              if (left > 2) pages.push('...');
              for (let i = left; i <= right; i++) pages.push(i);
              if (right < totalPages - 1) pages.push('...');
              if (totalPages > 1) pages.push(totalPages);
              return pages.map((p, idx) =>
                p === '...'
                  ? <span key={`e${idx}`} style={{padding:'0 6px',color:'var(--text-muted)',alignSelf:'center'}}>…</span>
                  : <button key={p} className={page===p?'active':''} onClick={()=>setPage(p)}>{p}</button>
              );
            })()}
            <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>
              {locale === 'ar' ? '← التالي' : 'Next →'}
            </button>
          </div>
        </>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h4>{locale === 'ar' ? 'إنشاء مستخدم جديد' : 'Create New User'}</h4>
              <button onClick={() => setModal(false)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="grid grid-2" style={{gap:12}}>
                  {[
                    [locale === 'ar' ? 'الاسم الكامل' : 'Full Name', 'name', 'text'],
                    [locale === 'ar' ? 'البريد الإلكتروني' : 'Email', 'email', 'email'],
                    [locale === 'ar' ? 'رقم الهاتف' : 'Phone', 'phone', 'tel']
                  ].map(([l, k, t]) => (
                    <div key={k} className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">{l}</label>
                      <input
                        className="form-control"
                        type={t}
                        value={form[k]}
                        placeholder={k === 'phone' ? '07XXXXXXXXX' : ''}
                        onChange={e => {
                          let val = e.target.value;
                          if (k === 'phone') {
                            const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                            for (let i = 0; i < 10; i++) {
                              val = val.replace(new RegExp(arabicDigits[i], 'g'), i);
                            }
                            val = val.replace(/[^0-9]/g, '');
                          }
                          setForm(p => ({ ...p, [k]: val }));
                        }}
                        required={k !== 'phone'}
                      />
                    </div>
                  ))}
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">{locale === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                    <div className="password-input-container">
                      <input className="form-control" type={showCreatePassword ? 'text' : 'password'} value={form.password} onChange={set('password')} required placeholder="••••••••" />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                      >
                        {showCreatePassword ? (
                          <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="form-group" style={{marginBottom:12}}>
                    <label className="form-label">{locale === 'ar' ? 'الدور' : 'Role'}</label>
                    <select className="form-control" value={form.role} onChange={set('role')}>
                      <option value="student">{locale === 'ar' ? 'طالب' : 'Student'}</option>
                      <option value="teacher">{locale === 'ar' ? 'مشرف أكاديمي' : 'Teacher'}</option>
                      <option value="admin">{locale === 'ar' ? 'مدير النظام' : 'Admin'}</option>
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom:12}}>
                    <label className="form-label">{locale === 'ar' ? 'الجنس' : 'Gender'}</label>
                    <select className="form-control" value={form.gender} onChange={set('gender')}>
                      <option value="">{locale === 'ar' ? 'اختر' : 'Select'}</option>
                      <option value="male">{locale === 'ar' ? 'ذكر' : 'Male'}</option>
                      <option value="female">{locale === 'ar' ? 'أنثى' : 'Female'}</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving 
                    ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...') 
                    : (locale === 'ar' ? 'إنشاء المستخدم' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Token Modal */}
      {tokenModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setTokenModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h4>🔑 Password Reset Token</h4>
              <button onClick={() => setTokenModal(false)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>User</p>
                <strong style={{ fontSize: '1rem' }}>{selectedUser.name}</strong>
                <span className="text-sm text-muted" style={{ marginLeft: 8 }}>({selectedUser.email})</span>
              </div>

              {activeToken ? (
                <div style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 20 }}>
                  <p className="text-xs text-muted" style={{ marginTop: 0, marginBottom: 8 }}>ACTIVE RESET TOKEN</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <code style={{ fontSize: '0.9rem', color: 'var(--accent)', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 4, flex: 1, wordBreak: 'break-all', userSelect: 'all' }}>
                      {activeToken}
                    </code>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(activeToken);
                        toast.success('Token copied!');
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                    Expires: {new Date(activeTokenExpiry).toLocaleString()}
                    {new Date(activeTokenExpiry) < new Date() ? ' (EXPIRED)' : ''}
                  </p>
                </div>
              ) : (
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  No active reset token found for this user.
                </div>
              )}

              <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
                Generate a new reset token so this user can reset their password. You can share this token with them directly.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setTokenModal(false)}>Close</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateToken}
                disabled={generatingToken}
              >
                {generatingToken ? 'Generating...' : '⚡ Generate Token'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
