import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import AlertBox from '../components/AlertBox';
import { getAllPatients, getEmergencyAlerts } from '../services/api';

const RISK_BADGE = {
  Low: 'badge-good',
  Medium: 'badge-warn',
  High: 'badge-danger',
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllPatients(), getEmergencyAlerts()]).then(([p, a]) => {
      setPatients(p);
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  const dismissAlert = (id) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const filtered = patients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || p.risk === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
      <Navbar user={{ name: localStorage.getItem('userName') || 'Doctor', role: 'Doctor' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>Patient overview</h1>
              <p className="page-sub">{patients.length} patients under your care right now.</p>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <AlertBox alerts={alerts} onDismiss={dismissAlert} />
          </div>

          <div className="card card-pad">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                placeholder="Search patients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 180,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 12px',
                  fontSize: 13.5,
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {['All', 'Low', 'Medium', 'High'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setFilter(lvl)}
                    className={filter === lvl ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ padding: '8px 14px', fontSize: 13 }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    {['Patient', 'Age', 'Recovery', 'Risk'].map((h) => (
                      <th key={h} className="eyebrow" style={{ padding: '0 10px 10px', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <>
                      {[1, 2, 3].map((i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                          <td style={{ padding: '12px 10px' }}><div className="skeleton skeleton-text" style={{ width: 140 }} /></td>
                          <td style={{ padding: '12px 10px' }}><div className="skeleton skeleton-text-sm" style={{ width: 30 }} /></td>
                          <td style={{ padding: '12px 10px' }}><div className="skeleton skeleton-text-sm" style={{ width: 80 }} /></td>
                          <td style={{ padding: '12px 10px' }}><div className="skeleton skeleton-text-sm" style={{ width: 60 }} /></td>
                        </tr>
                      ))}
                    </>
                  )}
                  {!loading && filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/doctor/patient/${p.id}`)}
                      style={{ borderBottom: '1px solid var(--border-soft)', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 10px', fontWeight: 600, fontSize: 14 }}>{p.name}</td>
                      <td style={{ padding: '12px 10px', fontSize: 13.5 }} className="text-muted">{p.age}</td>
                      <td style={{ padding: '12px 10px', fontSize: 13.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${p.recoveryPercent}%`, height: '100%', background: 'var(--good)' }} />
                          </div>
                          <span className="mono text-muted" style={{ fontSize: 12 }}>{p.recoveryPercent}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${RISK_BADGE[p.risk]}`}>
                          <span className="dot" />
                          {p.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan="4">
                        <div className="empty-state">
                          <span style={{ fontSize: 22 }}>🔍</span>
                          <span>No patients match this search.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}