import { useState } from 'react';
import { toast } from './Toast';
import { getHealthInsight } from '../services/api';

const URGENCY_STYLE = {
  routine: { color: 'var(--good)', label: 'Routine' },
  soon: { color: 'var(--warn)', label: 'See a doctor soon' },
  urgent: { color: 'var(--danger)', label: '⚠️ Seek care promptly' },
};

export default function HealthInsightCard({ symptoms, age, recoveryPercent }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!symptoms || symptoms.length === 0) {
      toast.error('Log a symptom first to get an AI insight.');
      return;
    }
    setLoading(true);
    try {
      const data = await getHealthInsight(symptoms, age, recoveryPercent);
      setInsight(data);
    } catch (err) {
      toast.error(err.message || 'Could not generate insight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insight ? 14 : 0 }}>
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>AI Health Insight</span>
          <p className="text-muted" style={{ fontSize: 12.5, margin: 0 }}>
            Looks at your recent symptoms together — not a diagnosis, just a starting point.
          </p>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 13, flexShrink: 0 }} onClick={handleGenerate} disabled={loading}>
          {loading ? 'Analyzing…' : insight ? 'Refresh' : '✨ Generate'}
        </button>
      </div>

      {insight && (
        <div>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: URGENCY_STYLE[insight.urgency]?.color || 'var(--text)',
              marginBottom: 10,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: URGENCY_STYLE[insight.urgency]?.color || 'var(--accent)' }} />
            {URGENCY_STYLE[insight.urgency]?.label || 'Informational'}
          </div>

          <p style={{ fontSize: 14, marginBottom: 12 }}>{insight.summary}</p>

          {insight.possible_considerations && insight.possible_considerations.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {insight.possible_considerations.map((c, i) => (
                <span key={i} className="badge badge-good" style={{ fontSize: 11.5 }}>{c}</span>
              ))}
            </div>
          )}

          <p className="text-faint" style={{ fontSize: 11, margin: 0 }}>
            This is an AI-generated informational summary, not a medical diagnosis. Always consult your doctor.
          </p>
        </div>
      )}
    </div>
  );
}