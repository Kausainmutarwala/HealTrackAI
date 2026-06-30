// Demo data — swap with real API responses once backend/routes are live.
// Shapes here are the contract the UI expects from FastAPI.

export const currentPatient = {
  id: 'p_104',
  name: 'Aarav Mehta',
  age: 34,
  recoveryPercent: 82,
  recoveryTrend: '+4% this week',
  riskLevel: 'Low',
  riskNote: 'Adherence and symptom score are both stable.',
};

export const recoveryTrendData = [
  { day: 'Mon', value: 62 },
  { day: 'Tue', value: 65 },
  { day: 'Wed', value: 70 },
  { day: 'Thu', value: 68 },
  { day: 'Fri', value: 75 },
  { day: 'Sat', value: 79 },
  { day: 'Sun', value: 82 },
];

export const symptomTrendData = [
  { day: 'Mon', value: 6 },
  { day: 'Tue', value: 6 },
  { day: 'Wed', value: 5 },
  { day: 'Thu', value: 5 },
  { day: 'Fri', value: 3 },
  { day: 'Sat', value: 3 },
  { day: 'Sun', value: 2 },
];

export const symptomLog = [
  { id: 1, label: 'Fatigue', severity: 'Mild', loggedAt: 'Today, 8:10 AM' },
  { id: 2, label: 'Joint pain', severity: 'Mild', loggedAt: 'Yesterday, 9:40 PM' },
  { id: 3, label: 'Fever', severity: 'None', loggedAt: 'Yesterday, 8:00 AM' },
];

export const medicineList = [
  { id: 1, name: 'Amoxicillin 500mg', time: '8:00 AM', taken: true },
  { id: 2, name: 'Vitamin D3', time: '8:00 AM', taken: true },
  { id: 3, name: 'Ibuprofen 200mg', time: '2:00 PM', taken: false },
  { id: 4, name: 'Amoxicillin 500mg', time: '8:00 PM', taken: false },
];

export const allPatients = [
  { id: 'p_104', name: 'Aarav Mehta', age: 34, recoveryPercent: 82, risk: 'Low' },
  { id: 'p_087', name: 'Sneha Kapoor', age: 27, recoveryPercent: 58, risk: 'Medium' },
  { id: 'p_212', name: 'Vikram Rao', age: 61, recoveryPercent: 31, risk: 'High' },
  { id: 'p_133', name: 'Priya Nair', age: 45, recoveryPercent: 90, risk: 'Low' },
  { id: 'p_059', name: 'Karan Joshi', age: 52, recoveryPercent: 44, risk: 'Medium' },
];

export const emergencyAlerts = [
  {
    id: 'a_1',
    patientName: 'Vikram Rao',
    message: 'Risk score crossed High threshold — recovery dropped 12% in 48h.',
    time: '12 min ago',
  },
];
