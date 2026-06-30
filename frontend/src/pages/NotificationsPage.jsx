import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { toast } from '../components/Toast';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/api';
import { timeAgo } from '../utils/dateUtils';

const TYPE_STYLES = {
  info: { bar: 'var(--accent)', badge: 'badge-good' },
  success: { bar: 'var(--good)', badge: 'badge-good' },
  warning: { bar: 'var(--warn)', badge: 'badge-warn' },
  danger: { bar: 'var(--danger)', badge: 'badge-danger' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNotifications()
      .then(setItems)
      .catch(() => toast.error('Could not load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      toast.error('Could not update notification');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Could not update notifications');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error('Could not delete notification');
    }
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: localStorage.getItem('userName') || 'User', role: localStorage.getItem('role') || 'Patient' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>Notifications</h1>
              <p className="page-sub">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You\'re all caught up.'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={handleMarkAll}>
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <div className="skeleton skeleton-card" />
          ) : items.length === 0 ? (
            <div className="card card-pad">
              <div className="empty-state">No notifications yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((n) => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                return (
                  <div
                    key={n.id}
                    className="card card-pad"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      borderLeft: `3px solid ${style.bar}`,
                      opacity: n.is_read ? 0.65 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                        {!n.is_read && <span className={`badge ${style.badge}`} style={{ fontSize: 10 }}>New</span>}
                      </div>
                      <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>{n.message}</p>
                      <span className="text-muted" style={{ fontSize: 11.5 }}>{timeAgo(n.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: '5px 10px' }}
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        style={{ color: 'var(--danger)', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 10px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}