import './RecoveryCard.css';

/**
 * RecoveryCard
 * props:
 *  - percent: number (0-100) recovery probability
 *  - trend: string, e.g. "+4% this week"
 *  - label: string, defaults to "Recovery"
 */
export default function RecoveryCard({ percent = 0, trend, label = 'Recovery' }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="card card-pad recovery-card">
      <div className="recovery-card-head">
        <span className="eyebrow">{label}</span>
        {trend && <span className="recovery-trend">{trend}</span>}
      </div>

      <div className="recovery-ring-wrap">
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="var(--good)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 66 66)"
            className="recovery-ring-arc"
          />
        </svg>
        <div className="recovery-ring-center">
          <span className="recovery-ring-value">{Math.round(clamped)}%</span>
          <span className="recovery-ring-caption">probability</span>
        </div>
      </div>
    </div>
  );
}
