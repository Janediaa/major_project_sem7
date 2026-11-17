import { Navigate, Route, Routes } from 'react-router-dom';
import { DoctorProvider, useDoctor } from './DoctorContext';
import DoctorLayout from './components/DoctorLayout';
import DoctorLogin from './pages/DoctorLogin';
import DoctorDashboard from './pages/DoctorDashboard';
import MyAppointments from './pages/MyAppointments';
import AppointmentRequests from './pages/AppointmentRequests';
import MyAvailability from './pages/MyAvailability';
import MyProfile from './pages/MyProfile';
// Load the shared patient-app styles first so doctor.css always comes after them
// in the bundle and its overrides win. (Importing a file twice does not duplicate it.)
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/pages.css';
import './styles/doctor.css';

// Route guard: demo only. There is no real authentication yet.
function RequireLogin() {
  const { session } = useDoctor();
  return session ? <DoctorLayout /> : <Navigate to="/doctor/login" replace />;
}

function LoginRoute() {
  const { session } = useDoctor();
  return session ? <Navigate to="/doctor" replace /> : <DoctorLogin />;
}

export default function DoctorApp() {
  return (
    <DoctorProvider>
      <Routes>
        <Route path="login" element={<LoginRoute />} />
        <Route element={<RequireLogin />}>
          <Route index element={<DoctorDashboard />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="requests" element={<AppointmentRequests />} />
          <Route path="availability" element={<MyAvailability />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/doctor" replace />} />
      </Routes>
    </DoctorProvider>
  );
}
