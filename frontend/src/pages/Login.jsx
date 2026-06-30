import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'Patient' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

 const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form);
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('role', form.role);
      localStorage.setItem('userName', res.name?.name || form.email);
      navigate(form.role === 'Doctor' ? '/doctor' : '/patient');
    } catch (err) {
      setError(err.message || 'Could not log in. Check your details and try again.');
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
            Log in to track recovery or review your patients.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={update('role')}>
              <option>Patient</option>
              <option>Doctor</option>
            </select>
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update('email')}
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={update('password')}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 18 }}>
          New here? <Link to="/register" style={{ color: 'var(--good)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
