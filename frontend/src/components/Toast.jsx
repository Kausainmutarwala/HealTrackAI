import { useEffect, useState } from 'react';

// Lightweight global toast system — no context/provider wiring needed.
// Call toast.success('Saved!') or toast.error('Failed') from anywhere,
// and <ToastContainer /> (mounted once in App.jsx) will display it.

let idCounter = 0;

function emit(message, type) {
  window.dispatchEvent(
    new CustomEvent('healtrack-toast', { detail: { id: ++idCounter, message, type } })
  );
}

export const toast = {
  success: (message) => emit(message, 'success'),
  error: (message) => emit(message, 'error'),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const item = e.detail;
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 3000);
    };
    window.addEventListener('healtrack-toast', handler);
    return () => window.removeEventListener('healtrack-toast', handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}