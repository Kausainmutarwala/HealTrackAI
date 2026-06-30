import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { getAdminDoctors, getAdminPatients, reassignPatient, adminDeleteUser } from '../services/api';
import { toast } from '../components/Toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('doctors');

  const load = () => {
    setLoading(true);
    Promise.all([getAdminDoctors(), getAdminPatients()])
      .then(([d, p]) => {
        setDoctors(d);
        setPatients(p);
      })
      .catch(() => toast.error('Could not load admin data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReassign = async (patientId, doctorId) => {
    try {
      await reassignPatient(patientId, doctorId || null);
      toast.success('Patient reassigned');
      load();
    } catch (err) {
      toast.error('Could not reassign patient');
    }
  };

  const handleDelete = async (userId, label) => {
    if (!window.confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(userId);
      toast.success('Account deleted');
      load();
    } catch (err) {
      toast.error('Could not delete account');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: localStorage.getItem('userName') || 'Admin', role: 'Admin' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>Admin Console</h1>
              <p className="page-sub">{doctors.length} doctors · {patients.length} patients across the system.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            <button
              className={tab === 'doctors' ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setTab('doctors')}
            >
              Doctors
            </button>
            <button
              className={tab === 'patients' ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setTab('patients')}
            >
              Patients
            </button>
          </div>

          {loading ? (
            <div className="skeleton skeleton-card" />
          ) : tab === 'doctors' ? (
            <div className="card card-pad">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Email', 'Patients', ''].map((h) => (
                        <th key={h} className="eyebrow" style={{ padding: '0 10px 10px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600, fontSize: 14 }}>{d.name}</td>
                        <td style={{ padding: '12px 10px', fontSize: 13 }} className="text-muted">{d.email}</td>
                        <td style={{ padding: '12px 10px', fontSize: 13 }}>
                          <span className="badge badge-good">{d.patient_count}</span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDelete(d.id, d.name)}
                            style={{ color: 'var(--danger)', fontSize: 12.5, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 10px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {doctors.length === 0 && (
                      <tr><td colSpan="4"><div className="empty-state">No doctors registered yet.</div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card card-pad">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Age', 'Recovery', 'Risk', 'Doctor', ''].map((h) => (
                        <th key={h} className="eyebrow" style={{ padding: '0 10px 10px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600, fontSize: 14 }}>{p.name}</td>
                        <td style={{ padding: '12px 10px', fontSize: 13 }} className="text-muted">{p.age}</td>
                        <td style={{ padding: '12px 10px', fontSize: 13 }} className="text-muted">{p.recovery_percent}%</td>
                        <td style={{ padding: '12px 10px', fontSize: 13 }}>
                          <span className={`badge ${p.risk_level === 'High' ? 'badge-danger' : p.risk_level === 'Medium' ? 'badge-warn' : 'badge-good'}`}>
                            {p.risk_level}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: 13 }}>
                          <select
                            value={p.doctor_id || ''}
                            onChange={(e) => handleReassign(p.id, e.target.value)}
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: 12.5, color: 'var(--text)' }}
                          >
                            <option value="">Unassigned</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/admin/patient/${p.id}`)}
                            style={{ color: 'var(--good)', fontSize: 12.5, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', marginRight: 6 }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(p.user_id, p.name)}
                            style={{ color: 'var(--danger)', fontSize: 12.5, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 10px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {patients.length === 0 && (
                      <tr><td colSpan="6"><div className="empty-state">No patients registered yet.</div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}