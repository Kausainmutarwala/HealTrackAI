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
  // General
  'Fever', 'Fatigue', 'Weakness', 'Chills', 'Night sweats', 'Weight loss',
  'Weight gain', 'Loss of appetite', 'Excessive thirst', 'Excessive hunger',
  'Body ache', 'Malaise', 'Dehydration',
  // Head / Neurological
  'Headache', 'Migraine', 'Dizziness', 'Fainting', 'Blurred vision',
  'Double vision', 'Light sensitivity', 'Memory loss', 'Confusion',
  'Numbness', 'Tingling sensation', 'Tremors', 'Seizures', 'Slurred speech',
  // Respiratory
  'Cough', 'Dry cough', 'Wet cough', 'Shortness of breath', 'Wheezing',
  'Sore throat', 'Runny nose', 'Blocked nose', 'Sneezing', 'Loss of smell',
  'Loss of taste', 'Chest tightness',
  // Cardiac
  'Chest pain', 'Palpitations', 'High blood pressure', 'Low blood pressure',
  'Irregular heartbeat', 'Swelling in legs',
  // Digestive
  'Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Stomach pain',
  'Bloating', 'Acid reflux', 'Heartburn', 'Loss of bowel control',
  'Blood in stool', 'Indigestion',
  // Musculoskeletal
  'Joint pain', 'Muscle pain', 'Back pain', 'Neck pain', 'Knee pain',
  'Shoulder pain', 'Muscle cramps', 'Muscle weakness', 'Joint stiffness',
  'Swelling in joints',
  // Skin
  'Rash', 'Itching', 'Dry skin', 'Hives', 'Bruising easily', 'Hair loss',
  'Acne', 'Skin discoloration',
  // ENT / Eyes
  'Ear pain', 'Hearing loss', 'Ringing in ears', 'Eye pain', 'Red eyes',
  'Watery eyes', 'Dry eyes',
  // Urinary / Reproductive
  'Frequent urination', 'Painful urination', 'Blood in urine',
  'Lower abdominal pain', 'Irregular periods', 'Menstrual cramps',
  // Mental health
  'Anxiety', 'Depression', 'Insomnia', 'Excessive sleepiness', 'Mood swings',
  'Irritability', 'Difficulty concentrating', 'Panic attacks',
  // Other
  'Swelling', 'Allergic reaction', 'Low energy', 'Cold hands/feet', 'Jaundice',
];

const ALL_MEDICINES = [
  // Pain & Fever
  'Paracetamol 500mg', 'Ibuprofen 200mg', 'Ibuprofen 400mg', 'Aspirin 75mg',
  'Aspirin 325mg', 'Diclofenac 50mg', 'Naproxen 250mg', 'Tramadol 50mg',
  // Antibiotics
  'Amoxicillin 500mg', 'Azithromycin 500mg', 'Doxycycline 100mg',
  'Cephalexin 500mg', 'Metronidazole 400mg', 'Ciprofloxacin 500mg',
  'Levofloxacin 500mg', 'Clindamycin 300mg', 'Co-amoxiclav 625mg',
  // Allergy / Respiratory
  'Cetirizine 10mg', 'Loratadine 10mg', 'Montelukast 10mg',
  'Levocetirizine 5mg', 'Salbutamol Inhaler', 'Budesonide Inhaler',
  'Dextromethorphan Syrup', 'Cough Syrup',
  // Gastro
  'Omeprazole 20mg', 'Pantoprazole 40mg', 'Ranitidine 150mg',
  'Domperidone 10mg', 'Ondansetron 4mg', 'ORS Sachet', 'Loperamide 2mg',
  'Antacid Syrup',
  // Cardiac / BP
  'Losartan 50mg', 'Atenolol 50mg', 'Amlodipine 5mg', 'Telmisartan 40mg',
  'Clopidogrel 75mg', 'Atorvastatin 10mg', 'Atorvastatin 20mg',
  'Rosuvastatin 10mg',
  // Diabetes
  'Metformin 500mg', 'Metformin 1000mg', 'Glimepiride 2mg',
  'Insulin (morning)', 'Insulin (night)', 'Sitagliptin 100mg',
  // Steroids / Immune
  'Prednisolone 5mg', 'Hydroxychloroquine 200mg', 'Dexamethasone 0.5mg',
  // Thyroid
  'Levothyroxine 50mcg', 'Levothyroxine 100mcg',
  // Vitamins & Supplements
  'Vitamin D3', 'Vitamin C 500mg', 'Vitamin B12', 'Vitamin B-Complex',
  'Calcium 500mg', 'Zinc 50mg', 'Iron 150mg', 'Folic Acid 5mg',
  'Multivitamin', 'Omega-3 Fish Oil', 'Magnesium 250mg',
  // Mental health
  'Sertraline 50mg', 'Escitalopram 10mg', 'Alprazolam 0.25mg',
  'Melatonin 3mg',
  // Topical / Eye / Ear
  'Calamine Lotion', 'Antiseptic Cream', 'Eye Drops', 'Ear Drops',
  'Hydrocortisone Cream',
  // Pediatric
  "Children's Paracetamol Syrup", 'Oral Rehydration Solution (Kids)',
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

  // The backend's MongoDB id for this patient — present only when real
  // (non-mock) data loaded. Used to know whether to persist or stay local.
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
        // Backend returns the FULL updated symptoms list — re-index from
        // that so our local "id" (= array position) always matches what
        // the server expects for delete/toggle calls.
        const list = (res.symptoms || []).map((s, i) => ({
          id: i,
          label: s.label,
          severity: s.severity,
          loggedAt: s.logged_at ? new Date(s.logged_at).toLocaleString() : 'Just now',
        }));
        setSymptoms(list);

        // The response also carries the freshly recalculated recovery %
        // and risk level — without this, the cards only update on the
        // next full page refresh instead of right away.
        setData((prev) => ({
          ...prev,
          recoveryTrend: [
            ...(prev.recoveryTrend || []),
            { day: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), value: res.recovery_percent },
          ].slice(-7),
          patient: {
            ...prev.patient,
            recoveryPercent: res.recovery_percent,
            recoveryTrend: `${res.recovery_percent}% recovered`,
            riskLevel: res.risk_level,
            riskNote: res.risk_note,
          },
        }));
        toast.success(`${label} logged`);
        return;
      } catch (err) {
        console.error('Failed to save symptom to server:', err);
        toast.error('Could not save symptom — added locally only');
      }
    }

    // Mock mode or server call failed — keep it local only
    setSymptoms((prev) => [...prev, { id: prev.length, label, severity: sev, loggedAt: 'Just now' }]);
  };

  const deleteSymptom = (id) => {
    setSymptoms((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, id: i })));
    if (patientId) {
      deleteSymptomFromServer(patientId, id)
        .then(() => toast.success('Symptom removed'))
        .catch((err) => {
          console.error('Failed to delete symptom on server:', err);
          toast.error('Could not remove symptom on server');
        });
    }
  };

  const addMedicine = async () => {
    if (!medInput.trim()) return;
    const name = medInput.trim();
    const time = medTime;
    setMedInput('');
    setMedTime('08:00');
    setShowMedForm(false);

    if (patientId) {
      try {
        const res = await addMedicineToServer(patientId, { name, time });
        setMedicines((res.medicines || []).map((m, i) => ({ id: i, ...m })));
        toast.success(`${name} added`);
        return;
      } catch (err) {
        console.error('Failed to save medicine to server:', err);
        toast.error('Could not save medicine — added locally only');
      }
    }

    // No logged-in patient (mock mode) or server call failed — keep it local
    setMedicines((prev) => [...prev, { id: prev.length, name, time, taken: false }]);
  };

  const selectSymptom = (s) => { setNewSymptom(s); setShowSuggestions(false); };

  const toggleMedicine = (id) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)));
    if (patientId) {
      toggleMedicineOnServer(patientId, id).catch((err) => {
        console.error('Failed to toggle medicine on server:', err);
      });
    }
  };

  const deleteMedicine = (id) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id).map((m, i) => ({ ...m, id: i })));
    if (patientId) {
      deleteMedicineFromServer(patientId, id)
        .then(() => toast.success('Medicine removed'))
        .catch((err) => {
          console.error('Failed to delete medicine on server:', err);
          toast.error('Could not remove medicine on server');
        });
    }
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
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
            </div>
            <div className="grid grid-2">
              <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius)' }} />
              <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius)' }} />
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

          <div className="grid grid-2" style={{ marginBottom: 18 }}>
            <RecoveryChart data={recoveryTrend} title="Recovery trend (7 days)" color="var(--good)" max={100} />

            <div className="card card-pad">
              <span className="eyebrow">Symptom tracking</span>
              <div style={{ position: 'relative', margin: '14px 0 8px' }}>
                <form onSubmit={logSymptom} style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="Type symptom, e.g. head"
                    value={newSymptom}
                    autoComplete="off"
                    onChange={(e) => { setNewSymptom(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13.5 }}
                  />
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 10px', fontSize: 13, color: 'var(--text)' }}
                  >
                    <option>Mild</option>
                    <option>Moderate</option>
                    <option>Severe</option>
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ padding: '9px 16px' }}>Log</button>
                </form>
                {showSuggestions && symFiltered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 52, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    {symFiltered.map((s) => (
                      <div key={s} onMouseDown={() => selectSymptom(s)}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13.5, borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', marginTop: 8 }}>
                {symptoms.length === 0 && (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <span style={{ fontSize: 22 }}>📋</span>
                    <span>No symptoms logged yet.</span>
                  </div>
                )}
                {[...symptoms].reverse().map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', fontSize: 13 }}>
                    <span>{s.label}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${s.severity === 'Severe' ? 'badge-danger' : s.severity === 'Moderate' ? 'badge-warn' : 'badge-good'}`} style={{ fontSize: 11 }}>
                        {s.severity}
                      </span>
                      <span className="text-faint">{s.loggedAt}</span>
                      <button
                        onClick={() => deleteSymptom(s.id)}
                        title="Delete"
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                  {showMedSug && medFiltered.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 20, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      {medFiltered.map(m => (
                        <div key={m} onMouseDown={() => { setMedInput(m); setShowMedSug(false); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="time"
                    value={medTime}
                    onChange={e => setMedTime(e.target.value)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: 13, color: 'var(--text)' }}
                  />
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={addMedicine}>Add</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {medicines.length === 0 && (
                <div className="empty-state" style={{ padding: 20 }}>
                  <span style={{ fontSize: 22 }}>💊</span>
                  <span>No medicines added yet.</span>
                </div>
              )}
              {medicines.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)' }}>
                  <input type="checkbox" checked={m.taken} onChange={() => toggleMedicine(m.id)} style={{ cursor: 'pointer' }} />
                  <span style={{ flex: 1, fontSize: 14, textDecoration: m.taken ? 'line-through' : 'none', opacity: m.taken ? 0.6 : 1 }}>
                    {m.name}
                  </span>
                  <MedicineCountdown time={m.time} taken={m.taken} />
                  <button
                    onClick={() => deleteMedicine(m.id)}
                    title="Delete"
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                  >
                    ×
                  </button>
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