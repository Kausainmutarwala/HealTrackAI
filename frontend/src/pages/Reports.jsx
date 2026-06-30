import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import RecoveryChart from '../components/RecoveryChart';
import { getPatientOverview } from '../services/api';

const RISK_COLOR = {
  Low: [34, 197, 94],
  Medium: [234, 179, 8],
  High: [239, 68, 68],
};

export default function Reports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getPatientOverview().then(setData);
  }, []);

  const userName = data?.patient?.name || localStorage.getItem('userName') || 'Patient';

  const exportPdf = () => {
    if (!data) return;
    const { patient, symptoms = [], medicines = [] } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 0;

    // --- Header bar ---
    doc.setFillColor(15, 23, 23);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(45, 212, 191); // teal accent
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('HealTrack AI', 14, 18);
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Recovery Report', 14, 27);
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 27, { align: 'right' });

    y = 50;
    doc.setTextColor(20, 20, 20);

    // Measure the note FIRST so the card can be made tall enough —
    // previously the card had a fixed height and a long risk note
    // would spill out past the bottom edge.
    doc.setFontSize(8.5);
    const noteLines = doc.splitTextToSize(patient.riskNote || '-', pageWidth - 152);
    const cardHeight = Math.max(34, 22 + noteLines.length * 4.2);

    // --- Patient summary card ---
    doc.setDrawColor(225, 225, 225);
    doc.setFillColor(248, 250, 250);
    doc.roundedRect(14, y, pageWidth - 28, cardHeight, 2, 2, 'FD');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(patient.name, 20, y + 11);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Age ${patient.age}`, 20, y + 19);

    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.setFont(undefined, 'bold');
    doc.text(`Recovery: ${patient.recoveryPercent}%`, 90, y + 11);

    const riskColor = RISK_COLOR[patient.riskLevel] || [120, 120, 120];
    doc.setFillColor(...riskColor);
    doc.roundedRect(90, y + 15, 38, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`${patient.riskLevel} risk`, 92, y + 20.5);

    doc.setTextColor(90, 90, 90);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.text(noteLines, 138, y + 11);

    y += cardHeight + 12;

    // --- Symptoms table ---
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Logged Symptoms', 14, y);
    y += 6;
    doc.setDrawColor(45, 212, 191);
    doc.setLineWidth(0.6);
    doc.line(14, y, 60, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text('Symptom', 16, y);
    doc.text('Severity', 100, y);
    doc.text('Logged at', 145, y);
    y += 3;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    doc.setTextColor(40, 40, 40);
    if (symptoms.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.text('No symptoms logged.', 16, y);
      y += 7;
    } else {
      symptoms.forEach((s, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 250);
          doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
        }
        doc.setTextColor(40, 40, 40);
        doc.text(s.label, 16, y);
        doc.text(s.severity, 100, y);
        doc.setFontSize(8);
        doc.text(String(s.loggedAt), 145, y);
        doc.setFontSize(9);
        y += 8;
      });
    }

    y += 10;

    // --- Medicines table ---
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('Medicines', 14, y);
    y += 6;
    doc.setDrawColor(45, 212, 191);
    doc.line(14, y, 60, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text('Medicine', 16, y);
    doc.text('Time', 110, y);
    doc.text('Status', 145, y);
    y += 3;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    if (medicines.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.text('No medicines added.', 16, y);
      y += 7;
    } else {
      medicines.forEach((m, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 250);
          doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
        }
        doc.setTextColor(40, 40, 40);
        doc.text(m.name, 16, y);
        doc.text(m.time, 110, y);
        doc.setTextColor(...(m.taken ? [34, 197, 94] : [234, 179, 8]));
        doc.text(m.taken ? 'Taken' : 'Pending', 145, y);
        y += 8;
      });
    }

    // --- Footer ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text('Generated by HealTrack AI', 14, 290);
      doc.text(`Page ${p} of ${pageCount}`, pageWidth - 14, 290, { align: 'right' });
    }

    doc.save(`HealTrackAI_Report_${patient.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: userName, role: localStorage.getItem('role') || 'Patient' }} />
        <div className="page-body">
          <div className="page-head">
            <div>
              <h1>Reports</h1>
              <p className="page-sub">Recovery and symptom history for the last 7 days.</p>
            </div>
            <button className="btn btn-ghost" onClick={exportPdf} disabled={!data}>
              Export PDF
            </button>
          </div>

          {!data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius)' }} />
              <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius)' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <RecoveryChart data={data.recoveryTrend} title="Recovery graph" color="var(--good)" max={100} />
              <RecoveryChart data={data.symptomTrend} title="Symptom trend (severity score, 0-10)" color="var(--warn)" max={10} />
              {data.recoveryTrend?.length === 0 && (
                <p className="text-muted" style={{ fontSize: 13 }}>
                  No history yet — log a few symptoms from the dashboard and they'll show up here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}