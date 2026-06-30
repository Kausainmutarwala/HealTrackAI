import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { toast } from '../components/Toast';
import { getTimelineData } from '../services/api';

const ALL_TIPS = [
  { category: 'Hydration', tip: 'Drink at least 8 glasses of water today — staying hydrated speeds up recovery and helps your body clear medication effectively.' },
  { category: 'Sleep', tip: 'Aim for 7–9 hours of sleep tonight. Your body repairs tissue and regulates immune response mostly during deep sleep.' },
  { category: 'Nutrition', tip: 'Add protein to every meal today — eggs, dal, paneer, or chicken all help rebuild strength while you recover.' },
  { category: 'Movement', tip: 'A short 10-minute walk (if your doctor has cleared it) can improve circulation and mood without overexerting you.' },
  { category: 'Medicine', tip: 'Set a fixed time for your medicines each day — consistency in timing improves how well they work in your body.' },
  { category: 'Mental health', tip: 'Recovery isn\'t just physical. Take 5 minutes today to breathe deeply or journal how you\'re feeling.' },
  { category: 'Hygiene', tip: 'Wash your hands before meals and medicine — small habit, big impact on avoiding setbacks during recovery.' },
  { category: 'Sunlight', tip: 'Spend 10–15 minutes in natural sunlight if possible — it supports Vitamin D levels and your mood.' },
  { category: 'Monitoring', tip: 'Log any new or worsening symptom the same day it appears — early logging helps your doctor catch issues sooner.' },
  { category: 'Rest', tip: 'Pushing through fatigue can slow recovery. Listen to your body and rest when it asks for it.' },
];

const RISK_TIPS = {
  High: { category: 'Priority', tip: '⚠️ Your risk level is currently High. Please follow your medication schedule strictly and contact your doctor if symptoms worsen — don\'t wait it out.' },
  Medium: { category: 'Priority', tip: '🟡 Your risk level is Medium. Keep logging symptoms daily so your doctor has accurate data to adjust your care if needed.' },
  Low: { category: 'Priority', tip: '✅ Your risk level is Low — great progress! Keep up your current routine and medicine adherence.' },
};

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function HealthTipsPage() {
  const [riskLevel, setRiskLevel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTimelineData()
      .then((data) => setRiskLevel(data.risk_level || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayTip = ALL_TIPS[dayOfYear() % ALL_TIPS.length];
  const otherTips = ALL_TIPS.filter((t) => t !== todayTip);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: localStorage.getItem('userName') || 'User', role: localStorage.getItem('role') || 'Patient' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>Health Tips</h1>
              <p className="page-sub">A small daily nudge to help your recovery stay on track.</p>
            </div>
          </div>

          {!loading && riskLevel && RISK_TIPS[riskLevel] && (
            <div
              className="card card-pad"
              style={{
                marginBottom: 16,
                borderLeft: `3px solid ${riskLevel === 'High' ? 'var(--danger)' : riskLevel === 'Medium' ? 'var(--warn)' : 'var(--good)'}`,
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 6 }}>{RISK_TIPS[riskLevel].category}</div>
              <p style={{ margin: 0, fontSize: 14 }}>{RISK_TIPS[riskLevel].tip}</p>
            </div>
          )}

          <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Today's Tip · {todayTip.category}</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{todayTip.tip}</p>
          </div>

          <div className="eyebrow" style={{ marginBottom: 10 }}>More tips</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {otherTips.map((t, i) => (
              <div key={i} className="card card-pad">
                <div className="eyebrow" style={{ marginBottom: 6 }}>{t.category}</div>
                <p className="text-muted" style={{ margin: 0, fontSize: 13.5 }}>{t.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}