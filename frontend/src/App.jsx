import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DoctorHospital from './pages/DoctorHospital.jsx';
import Insurance from './pages/Insurance.jsx';
import Triage from './pages/Triage.jsx';
import Appointments from './pages/Appointments.jsx';
import MedicalKnowledge from './pages/MedicalKnowledge.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="doctor-hospital" element={<DoctorHospital />} />
        <Route path="insurance" element={<Insurance />} />
        <Route path="triage" element={<Triage />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="medical-knowledge" element={<MedicalKnowledge />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
