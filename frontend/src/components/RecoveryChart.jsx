/**
 * RecoveryChart
 * A small dependency-free line chart — used for both recovery trend
 * and symptom trend (it's generic over any [{ day, value }] series).
 *
 * props:
 *  - data: [{ day: string, value: number }]
 *  - title: string
 *  - color: css color for the line (defaults to recovery teal)
 *  - max: optional fixed max for the y-axis (defaults to data max)
 */
export default function RecoveryChart({ data = [], title = 'Recovery trend', color = 'var(--good)', max }) {
  const width = 560;
  const height = 200;
  const padX = 28;
  const padY = 24;

  const values = data.map((d) => d.value);
  const yMax = max ?? Math.max(...values, 1);
  const yMin = Math.min(...values, 0);

  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const toY = (v) => {
    const ratio = yMax === yMin ? 0.5 : (v - yMin) / (yMax - yMin);
    return height - padY - ratio * (height - padY * 2);
  };

  const points = data.map((d, i) => [padX + i * stepX, toY(d.value)]);
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.[0] ?? padX} ${height - padY} L ${padX} ${height - padY} Z`;

  const gradientId = `chart-gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="eyebrow">{title}</span>
        {data.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color }}>
            {data[data.length - 1].value}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13.5 }}>No data logged yet.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* baseline */}
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="var(--border)" strokeWidth="1" />

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--surface)" stroke={color} strokeWidth="2" />
          ))}

          {data.map((d, i) => (
            <text
              key={d.day}
              x={padX + i * stepX}
              y={height - 4}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-faint)"
              fontFamily="var(--font-mono)"
            >
              {d.day}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
