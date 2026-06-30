import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import RecoveryCard from '../components/RecoveryCard';
import RiskCard from '../components/RiskCard';
import RecoveryChart from '../components/RecoveryChart';
import CaseSummaryCard from '../components/CaseSummaryCard';
import { getPatientDetail } from '../services/api';

const RANGE_OPTIONS = [
  { label: 'Last 1 day', value: 1 },
  { label: 'Last 2 days', value: 2 },
  { label: 'Last 3 days', value: 3 },
  { label: 'Last 5 days', value: 5 },
  { label: 'Last 7 days', value: 7 },
  { label: 'All time', value: 0 },
];

export default function PatientDetail() {
  const { patientId: id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState(7);

  // Came here from /admin or /doctor — go back to wherever we came from.
  const backTo = location.pathname.startsWith('/admin') ? '/admin' : '/doctor';

  useEffect(() => {
    getPatientDetail(id)
      .then(setData)
      .catch(() => setError('Could not load this patient. They may have been removed.'));
  }, [id]);

  const visibleTrend = data
    ? (range === 0 ? data.recoveryTrend : data.recoveryTrend.slice(-range))
    : [];

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: localStorage.getItem('userName') || 'User', role: localStorage.getItem('role') || 'Doctor' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <button
                onClick={() => navigate(backTo)}
                className="btn btn-ghost"
                style={{ marginBottom: 10, fontSize: 13, padding: '6px 12px' }}
              >
                ← Back to patients
              </button>
              <h1>{data ? data.patient.name : 'Patient'}</h1>
              <p className="page-sub">{data ? `Age ${data.patient.age}` : 'Loading…'}</p>
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

          {!data && !error && (
            <>
              <div className="grid grid-2" style={{ marginBottom: 18 }}>
                <div className="skeleton skeleton-card" />
                <div className="skeleton skeleton-card" />
              </div>
              <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius)' }} />
            </>
          )}

          {data && (
            <>
              <CaseSummaryCard
                patient={{
                  name: data.patient.name,
                  age: data.patient.age,
                  recovery_percent: data.patient.recoveryPercent,
                  risk_level: data.patient.riskLevel,
                  medicine_adherence: data.patient.medicineAdherence,
                  symptoms: data.symptoms,
                  weekly_snapshots: data.weeklySnapshots,
                }}
              />

              <div className="grid grid-2" style={{ marginBottom: 18 }}>
                <RecoveryCard percent={data.patient.recoveryPercent} trend={data.patient.recoveryTrend} />
                <RiskCard level={data.patient.riskLevel} note={data.patient.riskNote} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="eyebrow">Recovery trend</span>
                  <select
                    value={range}
                    onChange={(e) => setRange(Number(e.target.value))}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 10px',
                      fontSize: 12.5,
                      color: 'var(--text)',
                    }}
                  >
                    {RANGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <RecoveryChart data={visibleTrend} title="" color="var(--good)" max={100} />
              </div>

              <div className="grid grid-2" style={{ gap: 18 }}>
                <div className="card card-pad">
                  <span className="eyebrow">Logged symptoms</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {data.symptoms.length === 0 && (
                      <div className="empty-state" style={{ padding: 16 }}>
                        <span style={{ fontSize: 20 }}>📋</span>
                        <span>No symptoms logged yet.</span>
                      </div>
                    )}
                    {[...data.symptoms].reverse().map((s) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', fontSize: 13 }}>
                        <span>{s.label}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`badge ${s.severity === 'Severe' ? 'badge-danger' : s.severity === 'Moderate' ? 'badge-warn' : 'badge-good'}`} style={{ fontSize: 11 }}>
                            {s.severity}
                          </span>
                          <span className="text-faint">{s.loggedAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card card-pad">
                  <span className="eyebrow">Medicines</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {data.medicines.length === 0 && (
                      <div className="empty-state" style={{ padding: 16 }}>
                        <span style={{ fontSize: 20 }}>💊</span>
                        <span>No medicines added yet.</span>
                      </div>
                    )}
                    {data.medicines.map((m) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)' }}>
                        <span style={{ flex: 1, fontSize: 14, textDecoration: m.taken ? 'line-through' : 'none', opacity: m.taken ? 0.6 : 1 }}>
                          {m.name}
                        </span>
                        <span className="text-faint mono" style={{ fontSize: 12 }}>{m.time}</span>
                        <span className={`badge ${m.taken ? 'badge-good' : 'badge-warn'}`} style={{ fontSize: 11 }}>
                          {m.taken ? 'Taken' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}