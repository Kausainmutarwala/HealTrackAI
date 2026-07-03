import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { triggerSOS } from '../services/api';
import { toast } from './Toast';

const ICONS = {
  patient: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </svg>
  ),
  doctor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 2h6l1 4H8L9 2z" />
      <rect x="5" y="6" width="14" height="15" rx="2" />
      <path d="M12 11v4M10 13h4" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  ),
  appointments: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="15" x2="8" y2="15" strokeLinecap="round" strokeWidth="2.5" />
      <line x1="12" y1="15" x2="12" y2="15" strokeLinecap="round" strokeWidth="2.5" />
      <line x1="16" y1="15" x2="16" y2="15" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  ),
  notifications: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  messages: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1 8.38 8.38 0 0 1-5.4-1.9L3 20l1.9-4.1A8.38 8.38 0 0 1 3 9.5a8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 5.4 1.9 8.5 8.5 0 0 1 4.1 8.6z" />
    </svg>
  ),
  timeline: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="4" y1="6" x2="4" y2="18" />
      <circle cx="4" cy="6" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="4" cy="18" r="2" />
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
    </svg>
  ),
  tips: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.4.8 1 .8 1.7v.6h6.4v-.6c0-.7.3-1.3.8-1.7A7 7 0 0 0 12 2z" />
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  admin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
    </svg>
  ),
};

export default function Sidebar() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'Patient';
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [sosSending, setSosSending] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function logout() {
    localStorage.clear();
    navigate('/');
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  async function handleSOS() {
    const confirmed = window.confirm(
      'This will immediately alert your doctor and the admin team. Use only for a real emergency. Continue?'
    );
    if (!confirmed) return;

    setSosSending(true);
    try {
      await triggerSOS('Triggered from sidebar SOS button.');
      toast.success('SOS sent — your doctor has been alerted.');
    } catch {
      toast.error('Could not send SOS. Please call your doctor directly if this is urgent.');
    } finally {
      setSosSending(false);
    }
  }

  const patientLinks = [
    { to: '/patient',       label: 'Dashboard',     icon: ICONS.patient },
    { to: '/appointments',  label: 'Appointments',  icon: ICONS.appointments },
    { to: '/notifications', label: 'Notifications', icon: ICONS.notifications },
    { to: '/messages',      label: 'Messages',      icon: ICONS.messages },
    { to: '/timeline',      label: 'Timeline',      icon: ICONS.timeline },
    { to: '/health-tips',    label: 'Health Tips',   icon: ICONS.tips },
    { to: '/reports',       label: 'Reports',       icon: ICONS.reports },
    { to: '/profile',       label: 'My Profile',    icon: ICONS.profile },
  ];

  const doctorLinks = [
    { to: '/doctor',        label: 'Dashboard',     icon: ICONS.doctor },
    { to: '/appointments',  label: 'Appointments',  icon: ICONS.appointments },
    { to: '/notifications', label: 'Notifications', icon: ICONS.notifications },
    { to: '/messages',      label: 'Messages',      icon: ICONS.messages },
    { to: '/timeline',      label: 'Timeline',      icon: ICONS.timeline },
    { to: '/health-tips',    label: 'Health Tips',   icon: ICONS.tips },
    { to: '/reports',       label: 'Reports',       icon: ICONS.reports },
    { to: '/profile',       label: 'My Profile',    icon: ICONS.profile },
  ];

  const adminLinks = [
    { to: '/admin',         label: 'Admin Panel',   icon: ICONS.admin },
    { to: '/appointments',  label: 'Appointments',  icon: ICONS.appointments },
    { to: '/notifications', label: 'Notifications', icon: ICONS.notifications },
    { to: '/profile',       label: 'My Profile',    icon: ICONS.profile },
  ];

  const links = role === 'Doctor' ? doctorLinks : role === 'Admin' ? adminLinks : patientLinks;

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-dot" />
          HealTrack<span style={{ color: 'var(--accent)' }}>AI</span>
        </div>

        <ul className="sidebar-nav">
          {links.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
              >
                {icon}
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {role === 'Patient' && (
            <button
              onClick={handleSOS}
              disabled={sosSending}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                background: 'var(--danger)',
                color: '#fff',
                border: 'none',
                opacity: sosSending ? 0.7 : 1,
              }}
            >
              🚨 {sosSending ? 'Sending...' : 'Emergency SOS'}
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, fontSize: 13 }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, fontSize: 13, color: 'var(--warn)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav — scrollable row so all links fit */}
      <nav className="mobile-nav" style={{ overflowX: 'auto', justifyContent: 'flex-start', gap: 0 }}>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'mobile-nav-item' + (isActive ? ' active' : '')}
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
        {role === 'Patient' && (
          <button
            className="mobile-nav-item"
            onClick={handleSOS}
            disabled={sosSending}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}
          >
            <span style={{ fontSize: 16 }}>🚨</span>
            <span>SOS</span>
          </button>
        )}
        <button className="mobile-nav-item" onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>Theme</span>
        </button>
      </nav>
    </>
  );
}