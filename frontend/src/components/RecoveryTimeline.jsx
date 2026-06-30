export default function RecoveryTimeline({ snapshots = [] }) {
  if (snapshots.length === 0) {
    return (
      <div className="card card-pad">
        <span className="eyebrow" style={{ display: 'block', marginBottom: 14 }}>Recovery Timeline</span>
        <div className="empty-state" style={{ padding: 24 }}>
          <span style={{ fontSize: 24 }}>📅</span>
          <span>Timeline builds as you log symptoms each week.</span>
        </div>
      </div>
    );
  }

  const max = Math.max(...snapshots.map(s => s.recovery_percent), 1);

  return (
    <div className="card card-pad">
      <span className="eyebrow" style={{ display: 'block', marginBottom: 18 }}>Recovery Timeline</span>
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, background: 'var(--border)', borderRadius: 2 }} />

        {snapshots.map((snap, i) => {
          const isLast = i === snapshots.length - 1;
          const riskColor = snap.risk_level === 'High' ? 'var(--danger)' : snap.risk_level === 'Medium' ? 'var(--warn)' : 'var(--good)';
          const pct = Math.round(snap.recovery_percent);
          const barWidth = `${(pct / max) * 100}%`;

          return (
            <div key={i} style={{ position: 'relative', marginBottom: isLast ? 0 : 24 }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: -19, top: 4,
                width: 14, height: 14, borderRadius: '50%',
                background: riskColor, border: '2px solid var(--surface)',
                zIndex: 1,
              }} />

              <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Week {snap.week}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${snap.risk_level === 'High' ? 'badge-danger' : snap.risk_level === 'Medium' ? 'badge-warn' : 'badge-good'}`} style={{ fontSize: 10 }}>
                      {snap.risk_level} risk
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: riskColor }}>{pct}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: barWidth, height: '100%', background: riskColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text-faint)' }}>
                  <span>💊 {Math.round(snap.adherence * 100)}% adherence</span>
                  <span>📋 {snap.symptom_count} symptoms</span>
                  <span>📅 {new Date(snap.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}