import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { toast } from '../components/Toast';
import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  uploadProfilePhoto,
  getMyPhoto,
  removeProfilePhoto,
} from '../services/api';

// Resizes/compresses an image client-side before sending it to the
// backend, so we never ship a multi-MB upload over a base64 JSON body.
function resizeImage(file, maxSize = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [photo, setPhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setForm({
          name: data.name || '',
          age: data.age || '',
          surgery_date: data.surgery_date || '',
          doctor_name: data.doctor_name || '',
          blood_group: data.blood_group || '',
          contact: data.contact || '',
        });
      })
      .catch(() => setError('Could not load profile.'));

    getMyPhoto()
      .then((d) => setPhoto(d.photo_base64 || null))
      .catch(() => {});
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setMsg(''); setError('');
    try {
      const updated = await updateMyProfile({ ...form, age: parseInt(form.age, 10) || 0 });
      setProfile(updated);
      localStorage.setItem('userName', updated.name);
      setMsg('Profile updated!');
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    setPhotoUploading(true);
    try {
      const resized = await resizeImage(file);
      await uploadProfilePhoto(resized);
      setPhoto(resized);
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error(err.message || 'Could not upload photo');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    try {
      await removeProfilePhoto();
      setPhoto(null);
      toast.success('Photo removed');
    } catch {
      toast.error('Could not remove photo');
    }
  };

  const handlePasswordSave = async () => {
    setPwError('');
    if (!pwForm.current || !pwForm.next) {
      setPwError('Please fill in all fields.');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success('Password changed successfully!');
      setShowPasswordForm(false);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const userName = profile?.name || localStorage.getItem('userName') || 'User';
  const role = localStorage.getItem('role') || 'Patient';
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: userName, role }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>My Profile</h1>
              <p className="page-sub">Manage your personal and medical information.</p>
            </div>
            {!editing && (
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit Profile</button>
            )}
          </div>

          {error && <p style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 13.5 }}>{error}</p>}
          {msg && <p style={{ color: 'var(--good)', marginBottom: 16, fontSize: 13.5 }}>✓ {msg}</p>}

          {!profile ? (
            <div className="card card-pad">
              <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          ) : (
            <div className="grid grid-2" style={{ gap: 18 }}>
              {/* Avatar card */}
              <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
                <div style={{ position: 'relative' }}>
                  {photo ? (
                    <img
                      src={photo}
                      alt="Profile"
                      style={{
                        width: 80, height: 80, borderRadius: '50%',
                        objectFit: 'cover', border: '2px solid var(--good)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'var(--good-soft)', color: 'var(--good)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)',
                      border: '2px solid var(--good)',
                    }}>
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    title="Change photo"
                    style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'var(--accent)', color: '#fff', border: '2px solid var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    {photoUploading ? '…' : '✎'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />
                </div>

                {photo && (
                  <button
                    onClick={handlePhotoRemove}
                    style={{ fontSize: 11.5, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    Remove photo
                  </button>
                )}

                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>{profile.name}</p>
                  <p className="text-muted" style={{ fontSize: 13 }}>{profile.email}</p>
                  <span className={`badge ${role === 'Doctor' ? 'badge-warn' : 'badge-good'}`} style={{ marginTop: 8 }}>
                    <span className="dot" />{role}
                  </span>
                </div>
              </div>

              {/* Details card */}
              <div className="card card-pad">
                <span className="eyebrow" style={{ marginBottom: 16, display: 'block' }}>Personal Info</span>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { label: 'Full Name', key: 'name', type: 'text' },
                    { label: 'Age', key: 'age', type: 'number' },
                    { label: 'Blood Group', key: 'blood_group', type: 'text', placeholder: 'e.g. B+' },
                    { label: 'Contact Number', key: 'contact', type: 'text', placeholder: 'e.g. 9876543210' },
                    { label: 'Surgery Date', key: 'surgery_date', type: 'date' },
                    { label: 'Doctor Name', key: 'doctor_name', type: 'text', placeholder: 'Dr. Sharma' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key} className="field" style={{ marginBottom: 0 }}>
                      <label>{label}</label>
                      {editing ? (
                        <input
                          type={type}
                          value={form[key] || ''}
                          placeholder={placeholder || ''}
                          onChange={update(key)}
                        />
                      ) : (
                        <p style={{ fontSize: 14, padding: '10px 0', borderBottom: '1px solid var(--border)', color: form[key] ? 'var(--text)' : 'var(--text-faint)' }}>
                          {form[key] || '—'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {editing && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setEditing(false); setError(''); }} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Security card */}
              <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPasswordForm ? 16 : 0 }}>
                  <span className="eyebrow">Security</span>
                  {!showPasswordForm && (
                    <button className="btn btn-ghost" style={{ fontSize: 12.5, padding: '6px 12px' }} onClick={() => setShowPasswordForm(true)}>
                      Change Password
                    </button>
                  )}
                </div>

                {showPasswordForm && (
                  <div style={{ maxWidth: 360 }}>
                    {pwError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{pwError}</p>}
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>Current Password</label>
                      <input
                        type="password"
                        value={pwForm.current}
                        onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>New Password</label>
                      <input
                        type="password"
                        value={pwForm.next}
                        onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePasswordSave} disabled={pwSaving}>
                        {pwSaving ? 'Updating…' : 'Update Password'}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => { setShowPasswordForm(false); setPwError(''); setPwForm({ current: '', next: '', confirm: '' }); }}
                        disabled={pwSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats card */}
              <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
                <span className="eyebrow" style={{ marginBottom: 16, display: 'block' }}>Account Info</span>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Email', value: profile.email },
                    { label: 'Role', value: role },
                    { label: 'Member since', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-faint" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}