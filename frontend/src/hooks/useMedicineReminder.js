/**
 * useMedicineReminder
 * -------------------
 * Call this hook inside PatientDashboard with the current medicines list.
 * It:
 *   1. Requests browser notification permission on first call.
 *   2. Every 60 seconds checks if any un-taken medicine is due within
 *      the next 5 minutes (or already overdue by up to 10 minutes).
 *   3. Fires a browser notification once per medicine per day
 *      (tracks fired reminders in sessionStorage so it doesn't spam).
 */
import { useEffect } from 'react';

const REMINDER_KEY = 'healtrack_reminded'; // sessionStorage key

function getTodayPrefix() {
  return new Date().toDateString(); // "Thu Jul 03 2026"
}

function getFiredSet() {
  try {
    const raw = sessionStorage.getItem(REMINDER_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    // Reset if it's a new day
    if (parsed.date !== getTodayPrefix()) return new Set();
    return new Set(parsed.keys);
  } catch {
    return new Set();
  }
}

function saveFiredSet(set) {
  sessionStorage.setItem(
    REMINDER_KEY,
    JSON.stringify({ date: getTodayPrefix(), keys: [...set] })
  );
}

function shouldRemind(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
  const [h, m] = parts;
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diffMs = target - now;
  const diffMin = diffMs / 60000;
  // Remind if medicine is due in next 5 minutes OR overdue by up to 10 min
  return diffMin <= 5 && diffMin >= -10;
}

export default function useMedicineReminder(medicines) {
  useEffect(() => {
    // Request permission once
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!medicines || medicines.length === 0) return;
    if (!('Notification' in window)) return;

    const check = () => {
      if (Notification.permission !== 'granted') return;

      const fired = getFiredSet();
      let changed = false;

      medicines.forEach((med) => {
        if (med.taken) return; // already taken, skip
        const key = `${getTodayPrefix()}_${med.name}_${med.time}`;
        if (fired.has(key)) return; // already notified today

        if (shouldRemind(med.time)) {
          fired.add(key);
          changed = true;

          const now = new Date();
          const [h, m] = med.time.split(':').map(Number);
          const target = new Date();
          target.setHours(h, m, 0, 0);
          const diffMin = Math.round((target - now) / 60000);

          const body =
            diffMin > 0
              ? `${med.name} is due in ${diffMin} minute${diffMin !== 1 ? 's' : ''} at ${med.time}.`
              : `${med.name} was due at ${med.time}. Don't forget to take it!`;

          try {
            const notif = new Notification('💊 Medicine Reminder — HealTrack AI', {
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: key, // prevents duplicate system notifications
            });
            // Auto-close after 8 seconds
            setTimeout(() => notif.close(), 8000);
          } catch (e) {
            console.warn('Notification failed:', e);
          }
        }
      });

      if (changed) saveFiredSet(fired);
    };

    // Check immediately, then every 60 seconds
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [medicines]);
}