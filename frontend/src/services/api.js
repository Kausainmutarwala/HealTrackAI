const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function login({ email, password, role }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let message = 'Login failed';
    if (typeof err.detail === 'string') {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail
        .map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`)
        .join(' | ');
    }
    throw new Error(message);
  }
  const data = await res.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('role', data.role);
  localStorage.setItem('userName', data.user?.name || email);
  return data;
}

export async function getDoctorsList() {
  const res = await fetch(`${BASE_URL}/auth/doctors`);
  if (!res.ok) throw new Error('Failed to load doctors');
  return res.json();
}

export async function register({ name, email, password, role, age, doctorId, adminCode }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, email, password, role,
      age: parseInt(age, 10),
      doctor_id: role === 'Patient' ? (doctorId || null) : null,
      admin_code: role === 'Admin' ? (adminCode || null) : null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // FastAPI validation errors (422) send "detail" as an ARRAY of
    // objects, not a string — passing that straight into Error() makes
    // it render as "[object Object]". Extract the actual message(s).
    let message = 'Registration failed';
    if (typeof err.detail === 'string') {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail
        .map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`)
        .join(' | ');
    }
    throw new Error(message);
  }
  return res.json();
}

// Normalizes the real backend's flat patient doc into the same shape
// the mock data uses, so the dashboard component never has to care
// whether it's looking at real or fallback data.
function normalizePatientDoc(doc) {
  return {
    patient: {
      id: doc.id,
      name: doc.name,
      age: doc.age,
      recoveryPercent: doc.recovery_percent ?? 50,
      recoveryTrend: doc.recovery_percent != null ? `${doc.recovery_percent}% recovered` : 'Stable',
      riskLevel: doc.risk_level ?? 'Low',
      riskNote: doc.risk_note ?? 'No data yet.',
    },
    recoveryTrend: doc.recovery_history || [],
    symptomTrend: doc.symptom_history || [],
    symptoms: (doc.symptoms || []).map((s, i) => ({
      id: i,
      label: s.label,
      severity: s.severity,
      loggedAt: s.logged_at ? new Date(s.logged_at).toLocaleString() : 'Recently',
    })),
    medicines: (doc.medicines || []).map((m, i) => ({
      id: i,
      name: m.name,
      time: m.time,
      taken: !!m.taken,
    })),
  };
}

export async function getPatientOverview() {
  const token = getToken();

  if (!token) {
    const mock = await import('./mockData');
    return {
      patient: mock.currentPatient,
      recoveryTrend: mock.recoveryTrendData,
      symptomTrend: mock.symptomTrendData,
      symptoms: mock.symptomLog,
      medicines: mock.medicineList,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/patients/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    const doc = await res.json();
    return normalizePatientDoc(doc);
  } catch {
    const mock = await import('./mockData');
    return {
      patient: mock.currentPatient,
      recoveryTrend: mock.recoveryTrendData,
      symptomTrend: mock.symptomTrendData,
      symptoms: mock.symptomLog,
      medicines: mock.medicineList,
    };
  }
}

// --- Real persistence calls (these actually save to MongoDB) ---

export async function logSymptomToServer(patientId, { label, severity }) {
  const res = await fetch(`${BASE_URL}/patients/${patientId}/symptoms`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ patient_id: patientId, label, severity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = Array.isArray(err.detail)
      ? err.detail.map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join(' | ')
      : err.detail || 'Failed to save symptom';
    throw new Error(detail);
  }
  return res.json();
}

export async function addMedicineToServer(patientId, { name, time }) {
  const res = await fetch(`${BASE_URL}/patients/${patientId}/medicines`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, time }),
  });
  if (!res.ok) throw new Error('Failed to save medicine');
  return res.json();
}

export async function toggleMedicineOnServer(patientId, index) {
  const res = await fetch(`${BASE_URL}/patients/${patientId}/medicines/${index}/toggle`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to toggle medicine');
  return res.json();
}

export async function deleteSymptomFromServer(patientId, index) {
  const res = await fetch(`${BASE_URL}/patients/${patientId}/symptoms/${index}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete symptom');
  return res.json();
}

export async function deleteMedicineFromServer(patientId, index) {
  const res = await fetch(`${BASE_URL}/patients/${patientId}/medicines/${index}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete medicine');
  return res.json();
}

export async function getAllPatients() {
  try {
    const res = await fetch(`${BASE_URL}/patients`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    const docs = await res.json();
    // DoctorDashboard.jsx expects camelCase recoveryPercent/risk —
    // backend sends snake_case recovery_percent/risk_level.
    return docs.map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      recoveryPercent: p.recovery_percent ?? 0,
      risk: p.risk_level ?? 'Low',
    }));
  } catch {
    const mock = await import('./mockData');
    return mock.allPatients;
  }
}

export async function getEmergencyAlerts() {
  try {
    const res = await fetch(`${BASE_URL}/patients`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    const patients = await res.json();
    return patients
      .filter((p) => p.risk_level === 'High')
      .map((p) => ({
        id: p.id,
        patientName: p.name,
        message: 'Risk score is High — immediate attention needed.',
        time: 'Just now',
      }));
  } catch {
    const mock = await import('./mockData');
    return mock.emergencyAlerts;
  }
}

export async function getPatientDetail(patientId) {
  const res = await fetch(`${BASE_URL}/patients/${patientId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load patient');
  const doc = await res.json();
  return normalizePatientDoc(doc);
}

export async function getSymptomAdvice(symptom) {
  const res = await fetch(`${BASE_URL}/chat/symptom-advice`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ symptom }),
  });
  if (!res.ok) throw new Error('Failed to get advice');
  return res.json();
}

export async function askAI(message, context) {
  const res = await fetch(`${BASE_URL}/chat/ask`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'AI chat failed');
  }
  return res.json();
}

export async function getMyProfile() {
  const res = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateMyProfile({ name, age }) {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name, age: age ? parseInt(age, 10) : undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update profile');
  }
  return res.json();
}

export async function deleteMyAccount() {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete account (${res.status})`);
  }
  return res.json();
}

export async function getAdminDoctors() {
  const res = await fetch(`${BASE_URL}/admin/doctors`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load doctors');
  return res.json();
}

export async function getAdminPatients() {
  const res = await fetch(`${BASE_URL}/admin/patients`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load patients');
  return res.json();
}

export async function reassignPatient(patientId, doctorId) {
  const res = await fetch(`${BASE_URL}/admin/patients/${patientId}/reassign`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ doctor_id: doctorId || null }),
  });
  if (!res.ok) throw new Error('Failed to reassign patient');
  return res.json();
}

export async function adminDeleteUser(userId) {
  const res = await fetch(`${BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}

export { BASE_URL };
// ── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointments() {
  const res = await fetch(`${BASE_URL}/appointments`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch appointments');
  return res.json();
}

export async function createAppointment(payload) {
  // payload: { date, time, reason, notes, type }
  const res = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to book appointment');
  }
  return res.json();
}

export async function createAppointmentForPatient(patientId, payload) {
  // Doctor booking for a specific patient
  const res = await fetch(`${BASE_URL}/appointments/for-patient/${patientId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to book appointment');
  }
  return res.json();
}

export async function updateAppointmentStatus(apptId, status, notes) {
  const res = await fetch(`${BASE_URL}/appointments/${apptId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update appointment');
  }
  return res.json();
}

export async function deleteAppointment(apptId) {
  const res = await fetch(`${BASE_URL}/appointments/${apptId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete appointment');
  }
  return res.json();
}
// ===== Notifications =====

export async function getNotifications() {
  const res = await fetch(`${BASE_URL}/notifications`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

export async function getUnreadNotificationCount() {
  const res = await fetch(`${BASE_URL}/notifications/unread-count`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load unread count');
  return res.json();
}

export async function createNotification(payload) {
  // payload: { user_id, title, message, type }
  const res = await fetch(`${BASE_URL}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create notification');
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark notification read');
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark all read');
  return res.json();
}

export async function deleteNotification(id) {
  const res = await fetch(`${BASE_URL}/notifications/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete notification');
  return res.json();
}
// ===== Messages =====

export async function getThreads() {
  const res = await fetch(`${BASE_URL}/messages/threads`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load conversations');
  return res.json();
}

export async function getMessages(patientUserId) {
  const url = patientUserId
    ? `${BASE_URL}/messages?patient_user_id=${patientUserId}`
    : `${BASE_URL}/messages`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load messages');
  return res.json();
}

export async function sendMessage(text, patientUserId) {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text, patient_user_id: patientUserId }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}
// ===== Recovery Timeline =====
// Reuses existing patient data — no new backend route needed.
// patientId is undefined for a Patient viewing their own timeline,
// or set when a Doctor/Admin views a specific patient's timeline.

export async function getTimelineData(patientId) {
  const url = patientId ? `${BASE_URL}/patients/${patientId}` : `${BASE_URL}/patients/me`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load timeline data');
  return res.json();
}
// ===== Emergency SOS =====

export async function triggerSOS(message = '') {
  const res = await fetch(`${BASE_URL}/sos/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Failed to send SOS alert');
  return res.json();
}
// ===== AI Health Insight =====

export async function getHealthInsight(symptoms, age, recoveryPercent) {
  const res = await fetch(`${BASE_URL}/chat/health-insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ symptoms, age, recovery_percent: recoveryPercent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to get health insight');
  }
  return res.json();
}
// ===== Profile: Password + Photo =====

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to change password');
  }
  return res.json();
}

export async function uploadProfilePhoto(photoBase64) {
  const res = await fetch(`${BASE_URL}/auth/me/photo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ photo_base64: photoBase64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload photo');
  }
  return res.json();
}

export async function getMyPhoto() {
  const res = await fetch(`${BASE_URL}/auth/me/photo`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load photo');
  return res.json();
}

export async function removeProfilePhoto() {
  const res = await fetch(`${BASE_URL}/auth/me/photo`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to remove photo');
  return res.json();
}
// ===== AI Health Insight =====
// ===== AI Case Summary (Doctor view) =====

export async function getCaseSummary(patientData) {
  const res = await fetch(`${BASE_URL}/chat/case-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate case summary');
  }
  return res.json();
}
// ===== Discharge Summary =====

export async function generateDischargeSummary(patientData) {
  const res = await fetch(`${BASE_URL}/chat/discharge-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate discharge summary');
  }
  return res.json();
}
