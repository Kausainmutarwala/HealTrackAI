const LEVELS = ['Low', 'Medium', 'High'];

const TONE = {
  Low: { color: 'var(--good)', badge: 'badge-good' },
  Medium: { color: 'var(--warn)', badge: 'badge-warn' },
  High: { color: 'var(--danger)', badge: 'badge-danger' },
};

/**
 * RiskCard
 * props:
 *  - level: 'Low' | 'Medium' | 'High'
 *  - note: short explanatory string
 */
export default function RiskCard({ level = 'Low', note }) {
  const activeIndex = LEVELS.indexOf(level);
  const tone = TONE[level] || TONE.Low;

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="eyebrow">Risk assessment</span>
        <span className={`badge ${tone.badge}`}>
          <span className="dot" />
          {level} risk
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 18, marginBottom: 14 }}>
        {LEVELS.map((lvl, i) => (
          <div
            key={lvl}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 6,
              background: i <= activeIndex ? tone.color : 'var(--border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      <p className="text-muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        {note || 'No additional notes from the risk engine.'}
      </p>
    </div>
  );
}
