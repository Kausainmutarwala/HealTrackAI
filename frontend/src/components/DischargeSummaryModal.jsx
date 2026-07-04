import { useState } from 'react';
import jsPDF from 'jspdf';
import { toast } from './Toast';
import { generateDischargeSummary } from '../services/api';

export default function DischargeSummaryModal({ patient, onClose }) {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await generateDischargeSummary({
        patient_name: patient.name,
        age: patient.age,
        recovery_percent: patient.recovery_percent,
        risk_level: patient.risk_level,
        medicine_adherence: patient.medicine_adherence,
        symptoms: patient.symptoms || [],
        medicines: patient.medicines || [],
        weekly_snapshots: patient.weekly_snapshots || [],
        doctor_notes: doctorNotes,
      });
      setSummary(data.summary);
      setEditing(false);
      toast.success('Discharge summary generated!');
    } catch (err) {
      toast.error(err.message || 'Could not generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!summary) return;
    const doc = new jsPDF();
    const marginX = 16;
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(20, 100, 90);
    doc.text('HealTrack AI — Discharge Summary', marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, marginX, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(marginX, y, 195, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(0);

    // Word wrap the summary text
    const lines = doc.splitTextToSize(summary, 178);
    lines.forEach((line) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, marginX, y);
      y += 6;
    });

    doc.save(`DischargeSummary_${(patient.name || 'patient').replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded!');
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 301,
        transform: 'translate(-50%, -50%)',
        width: 'min(680px, 95vw)',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Discharge Summary</h2>
            <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0' }}>{patient.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>✕</button>
        </div>

        {/* Doctor notes */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Your notes (optional — AI will include these)</label>
          <textarea
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            placeholder="e.g. Patient responded well to treatment. Advised bed rest for 1 week. Follow up in 10 days..."
            rows={3}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              fontSize: 13.5,
              color: 'var(--text)',
              width: '100%',
              resize: 'vertical',
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 20 }}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating…' : summary ? '🔄 Regenerate Summary' : '✨ Generate AI Draft'}
        </button>

        {/* Summary output */}
        {summary && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="eyebrow">Summary Draft</span>
              <button
                onClick={() => setEditing(!editing)}
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '5px 10px' }}
              >
                {editing ? 'Done editing' : '✏️ Edit'}
              </button>
            </div>

            {editing ? (
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={16}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--good)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  fontSize: 13,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  resize: 'vertical',
                  lineHeight: 1.7,
                }}
              />
            ) : (
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                fontSize: 13,
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                maxHeight: 320,
                overflowY: 'auto',
              }}>
                {summary}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 14 }}
              onClick={handleDownloadPDF}
            >
              📄 Download PDF
            </button>
          </>
        )}
      </div>
    </>
  );
}