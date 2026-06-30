import { useEffect, useState } from 'react';

function getCountdown(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return { text: timeStr, overdue: false, soon: false };
  }
  const [h, m] = parts;
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);

  const diffMs = target - now;
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const hh = Math.floor(absMin / 60);
  const mm = absMin % 60;
  const label = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;

  if (diffMs < 0) {
    return { text: `Overdue by ${label}`, overdue: true, soon: false };
  }
  return { text: `in ${label}`, overdue: false, soon: absMin <= 30 };
}

/**
 * Live countdown to a daily medicine time (e.g. "08:00").
 * If `taken` is true, just shows the plain time — no point counting
 * down to a dose that's already been logged.
 */
export default function MedicineCountdown({ time, taken }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (taken) {
    return <span className="text-faint mono" style={{ fontSize: 12 }}>{time}</span>;
  }

  const { text, overdue, soon } = getCountdown(time);
  const color = overdue ? 'var(--danger)' : soon ? 'var(--warn)' : 'var(--text-faint)';

  return (
    <span className="mono" style={{ fontSize: 11.5, color, textAlign: 'right', whiteSpace: 'nowrap' }}>
      {time}
      <br />
      <span style={{ fontSize: 10.5 }}>{text}</span>
    </span>
  );
}