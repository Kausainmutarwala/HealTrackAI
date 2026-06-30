import { useState, useRef, useEffect } from 'react';
import { getSymptomAdvice, askAI } from '../services/api';

export default function ChatBox({ symptoms = [], patientContext = '' }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm your HealTrack assistant. Tap a symptom below for instant tips, or ask me anything." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const uniqueSymptoms = [...new Set(symptoms.map((s) => s.label))].slice(0, 4);

  const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);

  const handleAdviceClick = async (label) => {
    pushMessage({ from: 'user', text: `Advice for: ${label}` });
    setLoading(true);
    try {
      const res = await getSymptomAdvice(label);
      const text =
        `For ${label}:\n\n` +
        `✅ Eat: ${res.eat.join(', ')}\n\n` +
        `🚫 Avoid: ${res.avoid.join(', ')}\n\n` +
        `💡 ${res.tip}`;
      pushMessage({ from: 'bot', text });
    } catch (err) {
      pushMessage({ from: 'bot', text: "Sorry, couldn't fetch advice right now. Try again in a bit." });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    pushMessage({ from: 'user', text });
    setInput('');
    setLoading(true);
    try {
      const res = await askAI(text, patientContext);
      pushMessage({ from: 'bot', text: res.reply });
    } catch (err) {
      pushMessage({ from: 'bot', text: err.message || "Sorry, I couldn't reach the AI service. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
      <div style={{ marginBottom: 10 }}>
        <span className="eyebrow">Health Assistant</span>
        <p className="text-faint" style={{ fontSize: 11, marginTop: 2 }}>Not a substitute for medical advice</p>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '4px 2px',
          marginBottom: 10,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
              background: m.from === 'user' ? 'var(--good-soft)' : 'var(--surface-2)',
              color: m.from === 'user' ? 'var(--good)' : 'var(--text)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              maxWidth: '85%',
              whiteSpace: 'pre-line',
              lineHeight: 1.4,
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-faint)', fontSize: 12 }}>
            Thinking…
          </div>
        )}
      </div>

      {uniqueSymptoms.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {uniqueSymptoms.map((label) => (
            <button
              key={label}
              onClick={() => handleAdviceClick(label)}
              disabled={loading}
              style={{
                fontSize: 11.5,
                padding: '5px 10px',
                borderRadius: 100,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              Tips for {label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          disabled={loading}
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '9px 12px',
            fontSize: 13.5,
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '9px 16px', fontSize: 13 }}>
          Send
        </button>
      </form>
    </div>
  );
}