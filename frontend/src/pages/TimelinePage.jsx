import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { toast } from '../components/Toast';
import { getTimelineData } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';
import HealthInsightCard from '../components/HealthInsightCard';

const SEVERITY_COLOR = {
  None: 'var(--good)',
  Mild: 'var(--good)',
  Moderate: 'var(--warn)',
  Severe: 'var(--danger)',
};

export default function TimelinePage() {
  const { patientId } = useParams(); // present when a Doctor/Admin views a specific patient
  const [events, setEvents] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState('');

  useEffect(() => {
    getTimelineData(patientId)
      .then((data) => {
        setPatientName(data.name || '');
        setRawData(data);

        const symptomEvents = (data.symptoms || []).map((s) => ({
          type: 'symptom',
          date: s.logged_at,
          title: `Symptom logged: ${s.label}`,
          subtitle: s.severity,
          color: SEVERITY_COLOR[s.severity] || 'var(--accent)',
        }));

        const snapshotEvents = (data.weekly_snapshots || []).map((w) => ({
          type: 'snapshot',
          date: w.recorded_at,
          title: `Week ${w.week} summary`,
          subtitle: `Recovery ${w.recovery_percent}% · Risk ${w.risk_level} · Adherence ${Math.round((w.adherence || 0) * 100)}%`,
          color: w.risk_level === 'High' ? 'var(--danger)' : w.risk_level === 'Medium' ? 'var(--warn)' : 'var(--good)',
        }));

        const merged = [...symptomEvents, ...snapshotEvents].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setEvents(merged);
      })
      .catch(() => toast.error('Could not load recovery timeline'))
      .finally(() => setLoading(false));
  }, [patientId]);

  function downloadProgressReport() {
    if (!rawData) return;
    const doc = new jsPDF();
    const marginX = 16;
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(20, 100, 90);
    doc.text('HealTrack AI — Progress Report', marginX, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, marginX, y);
    y += 10;

    doc.setTextColor(0);
    doc.setFontSize(13);
    doc.text(`Patient: ${rawData.name || 'N/A'}`, marginX, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(`Age: ${rawData.age ?? 'N/A'}   |   Current Recovery: ${rawData.recovery_percent ?? 'N/A'}%   |   Risk Level: ${rawData.risk_level ?? 'N/A'}`, marginX, y);
    y += 6;
    if (rawData.risk_note) {
      doc.setTextColor(90);
      doc.text(`Note: ${rawData.risk_note}`, marginX, y);
      doc.setTextColor(0);
      y += 8;
    } else {
      y += 4;
    }

    doc.setDrawColor(200);
    doc.line(marginX, y, 195, y);
    y += 8;

    doc.setFontSize(13);
    doc.text('Weekly Summary', marginX, y);
    y += 7;
    doc.setFontSize(10);
    const snapshots = rawData.weekly_snapshots || [];
    if (snapshots.length === 0) {
      doc.setTextColor(120);
      doc.text('No weekly snapshots recorded yet.', marginX, y);
      doc.setTextColor(0);
      y += 8;
    } else {
      snapshots.forEach((w) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(
          `Week ${w.week}  —  Recovery: ${w.recovery_percent}%   Risk: ${w.risk_level}   Adherence: ${Math.round((w.adherence || 0) * 100)}%   Symptoms logged: ${w.symptom_count}`,
          marginX, y
        );
        y += 6;
      });
      y += 4;
    }

    doc.setDrawColor(200);
    doc.line(marginX, y, 195, y);
    y += 8;

    doc.setFontSize(13);
    doc.text('Symptom Log', marginX, y);
    y += 7;
    doc.setFontSize(10);
    const symptoms = rawData.symptoms || [];
    if (symptoms.length === 0) {
      doc.setTextColor(120);
      doc.text('No symptoms logged yet.', marginX, y);
      doc.setTextColor(0);
    } else {
      symptoms.slice().reverse().forEach((s) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${formatDateTime(s.logged_at)}  —  ${s.label} (${s.severity})`, marginX, y);
        y += 6;
      });
    }

    doc.save(`HealTrackAI_Progress_Report_${(rawData.name || 'patient').replace(/\s+/g, '_')}.pdf`);
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: localStorage.getItem('userName') || 'User', role: localStorage.getItem('role') || 'Patient' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>Recovery Timeline</h1>
              <p className="page-sub">
                {patientName ? `Chronological history for ${patientName}.` : 'Your recovery journey, day by day.'}
              </p>
            </div>
            {rawData && (
              <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={downloadProgressReport}>
                📄 Download Progress Report
              </button>
            )}
          </div>

          {!loading && rawData && !patientId && (
            <HealthInsightCard
              symptoms={rawData.symptoms || []}
              age={rawData.age}
              recoveryPercent={rawData.recovery_percent}
            />
          )}

          {loading ? (
            <div className="skeleton skeleton-card" />
          ) : events.length === 0 ? (
            <div className="card card-pad">
              <div className="empty-state">No history yet — log a symptom to start building your timeline.</div>
            </div>
          ) : (
            <div className="card card-pad">
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'var(--border)' }} />
                {events.map((e, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: 22 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -24,
                        top: 3,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: e.color,
                        border: '2px solid var(--surface)',
                      }}
                    />
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>
                      {formatDateTime(e.date)}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                    <div className="text-muted" style={{ fontSize: 13 }}>{e.subtitle}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}