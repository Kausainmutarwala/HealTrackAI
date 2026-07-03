import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import RecoveryCard from '../components/RecoveryCard';
import RiskCard from '../components/RiskCard';
import RecoveryChart from '../components/RecoveryChart';
import {
  getPatientOverview,
  logSymptomToServer,
  addMedicineToServer,
  toggleMedicineOnServer,
  deleteSymptomFromServer,
  deleteMedicineFromServer,
} from '../services/api';
import { toast } from '../components/Toast';
import ChatBox from '../components/ChatBox';
import MedicineCountdown from '../components/MedicineCountdown';

const ALL_SYMPTOMS = [
  'Fever','Fatigue','Weakness','Chills','Night sweats','Weight loss','Weight gain','Loss of appetite',
  'Excessive thirst','Excessive hunger','Body ache','Malaise','Dehydration','Headache','Migraine',
  'Dizziness','Fainting','Blurred vision','Double vision','Light sensitivity','Memory loss','Confusion',
  'Numbness','Tingling sensation','Tremors','Seizures','Slurred speech','Cough','Dry cough','Wet cough',
  'Shortness of breath','Wheezing','Sore throat','Runny nose','Blocked nose','Sneezing','Loss of smell',
  'Loss of taste','Chest tightness','Chest pain','Palpitations','High blood pressure','Low blood pressure',
  'Irregular heartbeat','Swelling in legs','Nausea','Vomiting','Diarrhea','Constipation','Stomach pain',
  'Bloating','Acid reflux','Heartburn','Loss of bowel control','Blood in stool','Indigestion',
  'Joint pain','Muscle pain','Back pain','Neck pain','Knee pain','Shoulder pain','Muscle cramps',
  'Muscle weakness','Joint stiffness','Swelling in joints','Rash','Itching','Dry skin','Hives',
  'Bruising easily','Hair loss','Acne','Skin discoloration','Ear pain','Hearing loss','Ringing in ears',
  'Eye pain','Red eyes','Watery eyes','Dry eyes','Frequent urination','Painful urination','Blood in urine',
  'Lower abdominal pain','Irregular periods','Menstrual cramps','Anxiety','Depression','Insomnia',
  'Excessive sleepiness','Mood swings','Irritability','Difficulty concentrating','Panic attacks',
  'Swelling','Allergic reaction','Low energy','Cold hands/feet','Jaundice',
];

const ALL_MEDICINES = [
  'Paracetamol 500mg','Ibuprofen 200mg','Ibuprofen 400mg','Aspirin 75mg','Aspirin 325mg',
  'Diclofenac 50mg','Naproxen 250mg','Tramadol 50mg','Amoxicillin 500mg','Azithromycin 500mg',
  'Doxycycline 100mg','Cephalexin 500mg','Metronidazole 400mg','Ciprofloxacin 500mg',
  'Levofloxacin 500mg','Clindamycin 300mg','Co-amoxiclav 625mg','Cetirizine 10mg','Loratadine 10mg',
  'Montelukast 10mg','Levocetirizine 5mg','Salbutamol Inhaler','Budesonide Inhaler',
  'Dextromethorphan Syrup','Cough Syrup','Omeprazole 20mg','Pantoprazole 40mg','Ranitidine 150mg',
  'Domperidone 10mg','Ondansetron 4mg','ORS Sachet','Loperamide 2mg','Antacid Syrup',
  'Losartan 50mg','Atenolol 50mg','Amlodipine 5mg','Telmisartan 40mg','Clopidogrel 75mg',
  'Atorvastatin 10mg','Atorvastatin 20mg','Rosuvastatin 10mg','Metformin 500mg','Metformin 1000mg',
  'Glimepiride 2mg','Insulin (morning)','Insulin (night)','Sitagliptin 100mg','Prednisolone 5mg',
  'Hydroxychloroquine 200mg','Dexamethasone 0.5mg','Levothyroxine 50mcg','Levothyroxine 100mcg',
  'Vitamin D3','Vitamin C 500mg','Vitamin B12','Vitamin B-Complex','Calcium 500mg','Zinc 50mg',
  'Iron 150mg','Folic Acid 5mg','Multivitamin','Omega-3 Fish Oil','Magnesium 250mg',
  'Sertraline 50mg','Escitalopram 10mg','Alprazolam 0.25mg','Melatonin 3mg',
  'Calamine Lotion','Antiseptic Cream','Eye Drops','Ear Drops','Hydrocortisone Cream',
  "Children's Paracetamol Syrup",'Oral Rehydration Solution (Kids)',
];

export default function PatientDashboard() {
  const [data, setData] = useState(null);
  const [newSymptom, setNewSymptom] = useState('');
  const [severity, setSeverity] = useState('Mild');
  const [symptoms, setSymptoms] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [medInput, setMedInput] = useState('');
  const [medTime, setMedTime] = useState('08:00');
  const [showMedSug, setShowMedSug] = useState(false);
  const [showMedForm, setShowMedForm] = useState(false);

  useEffect(() => {
    const userName = localStorage.getItem('userName') || 'Patient';
    getPatientOverview()
      .then((res) => {
        setData({ ...res, patient: { ...res.patient, name: res.patient?.name || userName } });
        setSymptoms(res.symptoms || []);
        setMedicines(res.medicines || []);
      })
      .catch(() => {
        import('../services/mockData').then((mock) => {
          setData({
            patient: { ...mock.currentPatient, name: userName },
            recoveryTrend: mock.recoveryTrendData,
            symptoms: mock.symptomLog,
            medicines: mock.medicineList,
          });
          setSymptoms(mock.symptomLog);
          setMedicines(mock.medicineList);
        });
      });
  }, []);

  const patientId = data?.patient?.id;
  const symFiltered = newSymptom.length > 0
    ? ALL_SYMPTOMS.filter(s => s.toLowerCase().includes(newSymptom.toLowerCase()))
    : [];
  const medFiltered = medInput.length > 0
    ? ALL_MEDICINES.filter(m => m.toLowerCase().includes(medInput.toLowerCase()))
    : ALL_MEDICINES.slice(0, 6);

  const logSymptom = async (e) => {
    e.preventDefault();
    if (!newSymptom.trim()) return;
    const label = newSymptom.trim();
    const sev = severity;
    setNewSymptom('');
    setShowSuggestions(false);
    if (patientId) {
      try {
        const res = await logSymptomToServer(patientId, { label, severity: sev });
        const list = (res.symptoms || []).map((s, i) => ({
          id: i, label: s.label, severity: s.severity,
          loggedAt: s.logged_at ? new Date(s.logged_at).toLocaleString() : 'Just now',
        }));
        setSymptoms(list);
        setData((prev) => ({
          ...prev,
          recoveryTrend: [
            ...(prev.recoveryTrend || []),
            { day: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), value: res.recovery_percent },
          ].slice(-7),
          patient: { ...prev.patient, recoveryPercent: res.recovery_percent, recoveryTrend: `${res.recovery_percent}% recovered`, riskLevel: res.risk_level, riskNote: res.risk_note },
        }));
        toast.success(`${label} logged`);
        return;
      } catch (err) {
        toast.error('Could not save symptom — added locally only');
      }
    }
    setSymptoms((prev) => [...prev, { id: prev.length, label, severity: sev, loggedAt: 'Just now' }]);
  };

  const deleteSymptom = (id) => {
    setSymptoms((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, id: i })));
    if (patientId) deleteSymptomFromServer(patientId, id).catch(() => {});
  };

  const addMedicine = async () => {
    if (!medInput.trim()) return;
    const name = medInput.trim();
    const time = medTime;
    setMedInput(''); setMedTime('08:00'); setShowMedForm(false);
    if (patientId) {
      try {
        const res = await addMedicineToServer(patientId, { name, time });
        setMedicines((res.medicines || []).map((m, i) => ({ id: i, ...m })));
        toast.success(`${name} added`);
        return;
      } catch (err) {
        toast.error('Could not save medicine — added locally only');
      }
    }
    setMedicines((prev) => [...prev, { id: prev.length, name, time, taken: false }]);
  };

  const toggleMedicine = (id) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)));
    if (patientId) toggleMedicineOnServer(patientId, id).catch(() => {});
  };

  const deleteMedicine = (id) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id).map((m, i) => ({ ...m, id: i })));
    if (patientId) deleteMedicineFromServer(patientId, id).catch(() => {});
  };

  if (!data) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Navbar />
          <div className="page-body">
            <div className="skeleton skeleton-text" style={{ width: 220, height: 26, marginBottom: 10 }} />
            <div className="skeleton skeleton-text-sm" style={{ width: 280, marginBottom: 24 }} />
            <div className="grid grid-3" style={{ marginBottom: 18 }}>
              <div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { patient, recoveryTrend } = data;
  const takenCount = medicines.filter((m) => m.taken).length;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={{ name: patient.name, role: 'Patient' }} />
        <div className="page-body">

          <div className="page-head">
            <div>
              <h1>Welcome back, {patient.name.split(' ')[0]}</h1>
              <p className="page-sub">Here's how your recovery is tracking today.</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            <RecoveryCard percent={patient.recoveryPercent} trend={patient.recoveryTrend} />
            <RiskCard level={patient.riskLevel} note={patient.riskNote} />
            <div className="card card-pad">
              <span className="eyebrow">Medicine adherence</span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginTop: 10 }}>
                {takenCount}/{medicines.length}
              </p>
              <p className="text-muted" style={{ fontSize: 13 }}>doses taken today</p>
            </div>
          </div>

          {/* Chart + Symptoms — stacks to 1 col on mobile */}
          <div className="grid grid-2" style={{ marginBottom: 18 }}>
            <RecoveryChart data={recoveryTrend} title="Recovery trend (7 days)" color="var(--good)" max={100} />

            <div className="card card-pad">
              <span className="eyebrow">Symptom tracking</span>

              {/* Symptom form — stacks on mobile */}
              <div style={{ position: 'relative', margin: '14px 0 8px' }}>
                <form onSubmit={logSymptom} className="symptom-form">
                  <input
                    className="symptom-input"
                    placeholder="Type symptom, e.g. headache"
                    value={newSymptom}
                    autoComplete="off"
                    onChange={(e) => { setNewSymptom(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  />
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="symptom-select"
                  >
                    <option>Mild</option>
                    <option>Moderate</option>
                    <option>Severe</option>
                  </select>
                  <button type="submit" className="btn btn-primary symptom-btn">Log</button>
                </form>
                {showSuggestions && symFiltered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    {symFiltered.map((s) => (
                      <div key={s} onMouseDown={() => { setNewSymptom(s); setShowSuggestions(false); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13.5, borderBottom: '1px solid var(--border)' }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Symptom list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
                {symptoms.length === 0 && (
                  <div className="empty-state" style={{ padding: 20 }}>No symptoms logged yet.</div>
                )}
                {[...symptoms].reverse().map((s) => (
                  <div key={s.id} className="symptom-item">
                    <span style={{ fontWeight: 500, fontSize: 13, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      <span className={`badge ${s.severity === 'Severe' ? 'badge-danger' : s.severity === 'Moderate' ? 'badge-warn' : 'badge-good'}`} style={{ fontSize: 11 }}>
                        {s.severity}
                      </span>
                      <span className="text-faint" style={{ fontSize: 11, display: 'none' }} id="sym-date">{s.loggedAt}</span>
                      <button onClick={() => deleteSymptom(s.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="card card-pad" style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span className="eyebrow">Today's medicines</span>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowMedForm(f => !f)}>
                {showMedForm ? 'Cancel' : '+ Add Medicine'}
              </button>
            </div>

            {showMedForm && (
              <div style={{ marginBottom: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input
                    placeholder="Search medicine..."
                    value={medInput}
                    autoComplete="off"
                    onChange={(e) => { setMedInput(e.target.value); setShowMedSug(true); }}
                    onFocus={() => setShowMedSug(true)}
                    onBlur={() => setTimeout(() => setShowMedSug(false), 150)}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box', color: 'var(--text)' }}
                  />
                  {showMedSug && medFiltered.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      {medFiltered.map(m => (
                        <div key={m} onMouseDown={() => { setMedInput(m); setShowMedSug(false); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="time" value={medTime} onChange={e => setMedTime(e.target.value)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: 13, color: 'var(--text)', flex: 1 }} />
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={addMedicine}>Add</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {medicines.length === 0 && (
                <div className="empty-state" style={{ padding: 20 }}>No medicines added yet.</div>
              )}
              {medicines.map((m) => (
                <div key={m.id} className="medicine-item">
                  <input type="checkbox" checked={m.taken} onChange={() => toggleMedicine(m.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, textDecoration: m.taken ? 'line-through' : 'none', opacity: m.taken ? 0.6 : 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </span>
                  <MedicineCountdown time={m.time} taken={m.taken} />
                  <button onClick={() => deleteMedicine(m.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <ChatBox
              symptoms={symptoms}
              patientContext={`Recovery: ${patient.recoveryPercent}%, Risk: ${patient.riskLevel}, Symptoms: ${symptoms.map((s) => `${s.label} (${s.severity})`).join(', ') || 'none logged'}`}
            />
          </div>

        </div>
      </div>
    </div>
  );
}