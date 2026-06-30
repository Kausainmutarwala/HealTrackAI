import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { toast } from '../components/Toast';
import {
  getAppointments,
  createAppointment,
  createAppointmentForPatient,
  updateAppointmentStatus,
  deleteAppointment,
  getAllPatients,
} from '../services/api';

const STATUS_STYLE = {
  Pending:   { background: 'var(--warn-soft)',  color: 'var(--warn)',  label: '⏳ Pending'   },
  Confirmed: { background: 'var(--good-soft)',  color: 'var(--good)',  label: '✅ Confirmed' },
  Cancelled: { background: 'rgba(220,53,69,0.12)', color: '#dc3545', label: '❌ Cancelled' },
};

const TYPE_ICON = { 'In-person': '🏥', 'Video': '📹' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AppointmentsPage() {
  const role = localStorage.getItem('role') || 'Patient';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  // Doctor: book for patient
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Form state
  const emptyForm = { date: '', time: '', reason: '', notes: '', type: 'In-person' };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const user = {
    name: localStorage.getItem('userName') || 'User',
    role,
  };

  useEffect(() => {
    loadAppointments();
    if (role === 'Doctor') {
      getAllPatients()
        .then(setPatients)
        .catch(() => setPatients([]));
    }
  }, []);

  async function loadAppointments() {
    setLoading(true);
    try {
      const data = await getAppointments();
      // Sort: upcoming first
      data.sort((a, b) => {
        const da = new Date(a.date + 'T' + a.time);
        const db2 = new Date(b.date + 'T' + b.time);
        return da - db2;
      });
      setAppointments(data);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.date || !form.time || !form.reason.trim()) {
      toast.error('Please fill date, time, and reason');
      return;
    }
    setSubmitting(true);
    try {
      let newAppt;
      if (role === 'Doctor' && selectedPatientId) {
        newAppt = await createAppointmentForPatient(selectedPatientId, form);
      } else {
        newAppt = await createAppointment(form);
      }
      setAppointments(prev => [newAppt, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      setSelectedPatientId('');
      toast.success('Appointment booked!');
    } catch (err) {
      toast.error(err.message || 'Failed to book');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(apptId, status) {
    try {
      const updated = await updateAppointmentStatus(apptId, status);
      setAppointments(prev => prev.map(a => a.id === apptId ? updated : a));
      toast.success(`Appointment ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  }

  async function handleDelete(apptId) {
    try {
      await deleteAppointment(apptId);
      setAppointments(prev => prev.filter(a => a.id !== apptId));
      toast.success('Appointment removed');
    } catch {
      toast.error('Failed to delete');
    }
  }

  const filtered = filterStatus === 'All'
    ? appointments
    : appointments.filter(a => a.status === filterStatus);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar user={user} />
        <div className="page-body">

          {/* Header */}
          <div className="page-head" style={{ marginBottom: 20 }}>
            <div>
              <h1>Appointments</h1>
              <p className="page-sub">
                {role === 'Patient'
                  ? 'Book and manage your appointments with your doctor.'
                  : 'View and manage patient appointments.'}
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(v => !v)}
            >
              {showForm ? 'Cancel' : '+ Book Appointment'}
            </button>
          </div>

          {/* Booking Form */}
          {showForm && (
            <div className="card" style={{ marginBottom: 24, padding: 24 }}>
              <h3 style={{ marginBottom: 16, fontSize: 15 }}>New Appointment</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                {/* Doctor: pick patient */}
                {role === 'Doctor' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="text-faint" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Patient *</label>
                    <select
                      className="input"
                      value={selectedPatientId}
                      onChange={e => setSelectedPatientId(e.target.value)}
                    >
                      <option value="">Select patient…</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-faint" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Date *</label>
                  <input
                    type="date"
                    className="input"
                    min={today}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-faint" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Time *</label>
                  <input
                    type="time"
                    className="input"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="text-faint" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Reason *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Follow-up checkup, Fever consultation…"
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-faint" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Type</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="In-person">🏥 In-person</option>
                    <option value="Video">📹 Video</option>
                  </select>
                </div>

                <div>
                  <label className="text-faint" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Notes (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Any additional notes…"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Booking…' : 'Confirm Booking'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {['All', 'Pending', 'Confirmed', 'Cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  background: filterStatus === s ? 'var(--accent)' : 'var(--surface)',
                  color: filterStatus === s ? '#fff' : 'var(--text)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: filterStatus === s ? 600 : 400,
                }}
              >
                {s}
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  {s === 'All' ? appointments.length : appointments.filter(a => a.status === s).length}
                </span>
              </button>
            ))}
          </div>

          {/* Appointments list */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>No {filterStatus !== 'All' ? filterStatus.toLowerCase() : ''} appointments</p>
              <span>
                {filterStatus === 'All'
                  ? 'Book your first appointment using the button above.'
                  : `No ${filterStatus.toLowerCase()} appointments found.`}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(appt => {
                const st = STATUS_STYLE[appt.status] || STATUS_STYLE.Pending;
                const isPast = new Date(appt.date + 'T' + appt.time) < new Date();

                return (
                  <div
                    key={appt.id}
                    className="card"
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      opacity: appt.status === 'Cancelled' ? 0.65 : 1,
                    }}
                  >
                    {/* Date block */}
                    <div style={{
                      minWidth: 52,
                      textAlign: 'center',
                      background: 'var(--surface-2)',
                      borderRadius: 10,
                      padding: '8px 6px',
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: 'var(--accent)' }}>
                        {appt.date ? new Date(appt.date + 'T00:00:00').getDate() : '--'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                        {appt.date ? new Date(appt.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' }) : ''}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                        {appt.time}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{appt.reason}</span>
                        <span style={{
                          fontSize: 11,
                          padding: '2px 9px',
                          borderRadius: 20,
                          background: st.background,
                          color: st.color,
                          fontWeight: 600,
                        }}>{st.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                          {TYPE_ICON[appt.type]} {appt.type}
                        </span>
                        {isPast && appt.status === 'Pending' && (
                          <span style={{ fontSize: 11, color: '#dc3545' }}>• Past</span>
                        )}
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 4 }}>
                        {role === 'Patient'
                          ? `Dr. ${appt.doctor_name}`
                          : `Patient: ${appt.patient_name}`}
                        {' · '}
                        {formatDate(appt.date)} at {appt.time}
                      </div>

                      {appt.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                          "{appt.notes}"
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Doctor: confirm/cancel */}
                      {role === 'Doctor' && appt.status === 'Pending' && (
                        <>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => handleStatusChange(appt.id, 'Confirmed')}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 12, padding: '5px 12px', color: '#dc3545' }}
                            onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* Patient: cancel if pending */}
                      {role === 'Patient' && appt.status === 'Pending' && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: '5px 12px', color: '#dc3545' }}
                          onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                        >
                          Cancel
                        </button>
                      )}

                      {/* Delete (doctor/admin always, patient only cancelled) */}
                      {(role === 'Doctor' || role === 'Admin' || appt.status === 'Cancelled') && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: '5px 10px', color: 'var(--text-faint)' }}
                          onClick={() => handleDelete(appt.id)}
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
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