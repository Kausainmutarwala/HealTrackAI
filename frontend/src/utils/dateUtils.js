// Backend timestamps sometimes come back WITHOUT a timezone marker
// (e.g. "2026-06-29T13:45:30.123456" instead of "...+00:00" or "...Z").
// When that happens, `new Date(iso)` wrongly treats it as LOCAL time
// instead of UTC, shifting every displayed time by your UTC offset
// (e.g. 5:30 hours off for IST). This helper normalizes it before parsing.

export function toLocalDate(isoString) {
  if (!isoString) return new Date(NaN);
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(isoString);
  return new Date(hasTimezone ? isoString : isoString + 'Z');
}

export function formatDateTime(isoString) {
  return toLocalDate(isoString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(isoString) {
  return toLocalDate(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(isoString) {
  const diffMs = Date.now() - toLocalDate(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}