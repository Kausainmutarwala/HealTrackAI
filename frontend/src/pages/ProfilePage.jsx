import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { getMyProfile, updateMyProfile, deleteMyAccount } from '../services/api';
import { toast } from '../components/Toast';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setAge(String(p.age));
      })
      .catch(() => toast.error('Could not load your profile'));
  }, []);

  const initials = profile
    ? profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
    : '';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile({ name: name.trim(), age });
      setProfile(updated);
      localStorage.setItem('userName', updated.name);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Permanently delete your account? This will remove all your data and cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success('Account deleted');
      localStorage.clear();
      window.location.href = '/';
    } catch (err) {
      toast.error(err.message || 'Could not delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: profile?.name || localStorage.getItem('userName') || 'User', role: profile?.role || localStorage.getItem('role') || 'Patient' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>My Profile</h1>
              <p className="page-sub">View and update your account details.</p>
            </div>
          </div>

          {!profile ? (
            <div className="skeleton skeleton-card" style={{ maxWidth: 480 }} />
          ) : (
            <div className="card card-pad" style={{ maxWidth: 480 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--good-soft)',
                    color: 'var(--good)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 22,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {initials}
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700 }}>{profile.name}</p>
                  <span className={`badge ${profile.role === 'Doctor' ? 'badge-warn' : 'badge-good'}`} style={{ marginTop: 4 }}>
                    {profile.role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSave}>
                <div className="field">
                  <label>Full name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="field">
                  <label>Age</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>

                <div className="field">
                  <label>Email</label>
                  <input value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  <p className="text-faint" style={{ fontSize: 11.5, marginTop: 2 }}>Email can't be changed.</p>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </form>

              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <span className="eyebrow" style={{ color: 'var(--danger)' }}>Danger zone</span>
                <p className="text-muted" style={{ fontSize: 12.5, margin: '8px 0 12px' }}>
                  Deleting your account removes all your data permanently — symptoms, medicines, and history.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--danger-soft)',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger)',
                    fontWeight: 600,
                    fontSize: 13.5,
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}