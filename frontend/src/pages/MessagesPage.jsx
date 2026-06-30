import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { toast } from '../components/Toast';
import { getThreads, getMessages, sendMessage } from '../services/api';
import { formatTime } from '../utils/dateUtils';

export default function MessagesPage() {
  const role = localStorage.getItem('role') || 'Patient';
  const mySub = (() => {
    try {
      return JSON.parse(atob(localStorage.getItem('token').split('.')[1])).sub;
    } catch {
      return null;
    }
  })();

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null); // { doctor_id, patient_user_id, other_name }
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  // Load threads (patients see exactly one, doctors see a list)
  useEffect(() => {
    getThreads()
      .then((t) => {
        setThreads(t);
        if (t.length > 0) setActiveThread(t[0]);
      })
      .catch(() => toast.error('Could not load conversations'))
      .finally(() => setLoading(false));
  }, []);

  // Load + poll messages for the active thread
  useEffect(() => {
    if (!activeThread) return;

    const fetchMessages = () => {
      getMessages(activeThread.patient_user_id)
        .then(setMessages)
        .catch(() => {});
    };

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [activeThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeThread) return;
    setSending(true);
    try {
      const msg = await sendMessage(text, activeThread.patient_user_id);
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch {
      toast.error('Message could not be sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: localStorage.getItem('userName') || 'User', role }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>Messages</h1>
              <p className="page-sub">
                {role === 'Doctor' ? 'Chat with your patients.' : 'Chat with your assigned doctor.'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="skeleton skeleton-card" />
          ) : threads.length === 0 ? (
            <div className="card card-pad">
              <div className="empty-state">
                {role === 'Doctor'
                  ? 'No patients assigned to you yet.'
                  : 'No doctor assigned yet — ask an admin to assign one.'}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', height: '70vh', overflow: 'hidden' }}>
              {/* Thread list — only meaningful for doctors with multiple patients */}
              {role === 'Doctor' && (
                <div style={{ width: 220, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
                  {threads.map((t) => (
                    <button
                      key={t.patient_user_id}
                      onClick={() => setActiveThread(t)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        background: activeThread?.patient_user_id === t.patient_user_id ? 'var(--surface-2)' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--border-soft)',
                        cursor: 'pointer',
                        color: 'var(--text)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.other_name}</div>
                      {t.last_message && (
                        <div className="text-muted" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.last_message}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
                  {activeThread?.other_name || 'Conversation'}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {messages.length === 0 ? (
                    <div className="empty-state">No messages yet — say hello!</div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender_id === mySub;
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            background: isMine ? 'var(--accent)' : 'var(--surface-2)',
                            color: isMine ? '#fff' : 'var(--text)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px 12px',
                          }}
                        >
                          <div style={{ fontSize: 13.5 }}>{m.text}</div>
                          <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      color: 'var(--text)',
                      fontSize: 13.5,
                    }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}