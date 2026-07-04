import { useState } from 'react';
import { toast } from './Toast';
import { getCaseSummary } from '../services/api';

export default function CaseSummaryCard({ patient }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const payload = {
        patient_name: patient.name || patient.patient_name || 'Unknown',
        age: patient.age ?? null,
        recovery_percent: patient.recovery_percent ?? patient.recoveryPercent ?? null,
        risk_level: patient.risk_level ?? patient.riskLevel ?? null,
        medicine_adherence: patient.medicine_adherence ?? patient.medicineAdherence ?? null,
        symptoms: patient.symptoms || [],
        weekly_snapshots: patient.weekly_snapshots || [],
      };
      const data = await getCaseSummary(payload);
      setSummary(data);
    } catch (err) {
      toast.error(err.message || 'Could not generate case summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: summary ? 12 : 0 }}>
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>AI Case Briefing</span>
          <p className="text-muted" style={{ fontSize: 12.5, margin: 0 }}>
            A quick AI-written summary of this patient's trend, generated from their logged data.
          </p>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 13, flexShrink: 0 }} onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : summary ? 'Refresh' : '✨ Generate'}
        </button>
      </div>
      {summary && (
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{summary.summary}</p>
      )}
    </div>
  );
}