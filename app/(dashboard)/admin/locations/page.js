'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', city: '', region: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const data = await api.locations.list(); setLocations(data.locations || []); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => {
    Promise.resolve().then(() => {
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => { setEditItem(null); setForm({ name: '', city: '', region: '' }); setModal(true); };
  const openEdit = (loc) => { setEditItem(loc); setForm({ name: loc.name, city: loc.city, region: loc.region || '' }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) { await api.locations.update(editItem._id, form); toast.success('Location updated'); }
      else { await api.locations.create(form); toast.success('Location added'); }
      setModal(false); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await api.locations.delete(id); toast.success('Location deleted'); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="page-header flex-between" style={{flexWrap:'wrap',gap:12}}>
        <div><h1>Locations</h1><p className="text-muted">Manage training pharmacy locations</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Location</button>
      </div>

      {loading ? <div className="flex-center" style={{height:200}}><div className="spinner" /></div> : (
        <div className="table-wrapper card" style={{padding:0}}>
          <table>
            <thead><tr><th>#</th><th>Pharmacy Name</th><th>City</th><th>Region</th><th>Actions</th></tr></thead>
            <tbody>
              {locations.length === 0
                ? <tr><td colSpan={5} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>No locations yet.</td></tr>
                : locations.map((l, i) => (
                  <tr key={l._id}>
                    <td className="text-muted">{i + 1}</td>
                    <td style={{fontWeight:600}}>{l.name}</td>
                    <td>{l.city}</td>
                    <td className="text-muted">{l.region || '—'}</td>
                    <td style={{display:'flex',gap:8}}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l._id, l.name)}>🗑️</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h4>{editItem ? 'Edit Location' : 'Add Location'}</h4>
              <button onClick={() => setModal(false)} className="btn btn-icon btn-secondary">✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {[['Pharmacy Name','name','e.g. Al-Nour Pharmacy'],['City','city','e.g. Mosul'],['Region','region','e.g. Nineveh (optional)']].map(([l,k,ph]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{l}</label>
                    <input className="form-control" placeholder={ph} value={form[k]}
                      onChange={e => setForm(p=>({...p,[k]:e.target.value}))} required={k!=='region'} />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Add Location'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
