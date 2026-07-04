import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import RecoveryCard from '../components/RecoveryCard';
import RiskCard from '../components/RiskCard';
import RecoveryChart from '../components/RecoveryChart';
import CaseSummaryCard from '../components/CaseSummaryCard';
import DischargeSummaryModal from '../components/DischargeSummaryModal';
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
  const [showDischarge, setShowDischarge] = useState(false);

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
              <h1>{data ? data.name : 'Patient'}</h1>
            </div>
            {data && (
              <button
                className="btn btn-primary"
                style={{ fontSize: 13 }}
                onClick={() => setShowDischarge(true)}
              >
                📋 Discharge Summary
              </button>
            )}
          </div>

          {showDischarge && data && (
            <DischargeSummaryModal
              patient={data}
              onClose={() => setShowDischarge(false)}
            />
          )}

          {error && (
            <div className="card card-pad">
              <div className="empty-state">{error}</div>
            </div>
          )}

          {!error && !data && (
            <div className="card card-pad">
              <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          )}

          {data && (
            <>
              <CaseSummaryCard patient={data} />

              <div className="grid grid-2" style={{ gap: 18, marginBottom: 18 }}>
                <RecoveryCard percent={data.recovery_percent} />
                <RiskCard level={data.risk_level} note={data.risk_note} />
              </div>

              <div className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span className="eyebrow">Recovery Trend</span>
                  <select
                    value={range}
                    onChange={(e) => setRange(Number(e.target.value))}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: 12.5, color: 'var(--text)' }}
                  >
                    {RANGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <RecoveryChart data={visibleTrend} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}