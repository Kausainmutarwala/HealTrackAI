import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import PatientDetail from './pages/PatientDetail';
import AppointmentsPage from './pages/AppointmentsPage';
import { ToastContainer } from './components/Toast';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import TimelinePage from './pages/TimelinePage';
import HealthTipsPage from './pages/HealthTipsPage';

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/doctor/patient/:patientId" element={<PatientDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/patient/:patientId" element={<PatientDetail />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/health-tips" element={<HealthTipsPage />} />
      </Routes>
    </>
  );
}