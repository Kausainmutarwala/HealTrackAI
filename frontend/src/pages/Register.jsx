import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, getDoctorsList } from '../services/api';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', age: '', email: '', password: '', role: 'Patient', doctorId: '' });
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDoctorsList().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.age || !form.email || !form.password) {
      setError('Fill in every field to create your account.');
      return;
    }

    if (form.role === 'Patient' && doctors.length > 0 && !form.doctorId) {
      setError('Please select your doctor.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(form);
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('role', res.role);
      localStorage.setItem('userName', res.user?.name || form.name);
      navigate(res.role === 'Doctor' ? '/doctor' : res.role === 'Admin' ? '/admin' : '/patient');
    } catch (err) {
      setError(err.message || 'Could not create the account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card card card-pad">
        <div className="auth-brand">
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>
            HealTrack<span style={{ color: 'var(--good)' }}>AI</span>
          </span>
          <p className="text-muted" style={{ fontSize: 13.5, marginTop: 6 }}>
            Create an account to start tracking recovery.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input placeholder="Aarav Mehta" value={form.name} onChange={update('name')} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Age</label>
              <input type="number" placeholder="34" value={form.age} onChange={update('age')} />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={update('role')}>
                <option>Patient</option>
                <option>Doctor</option>
                <option>Admin</option>
              </select>
            </div>
          </div>

          {form.role === 'Admin' && (
            <div className="field">
              <label>Admin code</label>
              <input
                type="password"
                placeholder="Enter the admin invite code"
                value={form.adminCode || ''}
                onChange={update('adminCode')}
              />
            </div>
          )}

          {form.role === 'Patient' && (
            <div className="field">
              <label>Your doctor</label>
              {doctors.length === 0 ? (
                <p className="text-faint" style={{ fontSize: 12 }}>
                  No doctors registered yet — you can be assigned to one later.
                </p>
              ) : (
                <select value={form.doctorId} onChange={update('doctorId')}>
                  <option value="">Select a doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={update('password')} />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 18 }}>
          Already have an account? <Link to="/" style={{ color: 'var(--good)', fontWeight: 600 }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}