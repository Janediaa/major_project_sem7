import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ROLES, useAuth } from '../context/AuthContext';
import {
  appendDoctorActivity,
  getLiveDoctorAppointments,
  getStoredDoctorActivity,
  getStoredDoctorAvailability,
  getStoredDoctorProfile,
  persistAppointmentStatus,
  saveDoctorAvailability,
  saveDoctorProfile,
} from '../services/doctorService';
import { DEMO_DOCTOR } from './data/mockDoctorData';

// State for the Doctor Portal. Integrates with backend APIs and AuthContext.
const DoctorContext = createContext(null);

export function DoctorProvider({ children }) {
  const auth = useAuth();
  const [session, setSession] = useState(() => {
    if (auth?.user && auth.user.role === ROLES.DOCTOR) {
      return { email: auth.user.email, name: auth.user.name };
    }
    return null;
  });

  useEffect(() => {
    if (auth?.user && auth.user.role === ROLES.DOCTOR) {
      setSession({ email: auth.user.email, name: auth.user.name });
    }
  }, [auth?.user]);

  const [profile, setProfile] = useState(() => {
    const stored = getStoredDoctorProfile();
    if (auth?.user && auth.user.role === ROLES.DOCTOR && auth.user.name) {
      return {
        ...stored,
        name: auth.user.name.startsWith('Dr.') ? auth.user.name : `Dr. ${auth.user.name}`,
        email: auth.user.email || stored.email || DEMO_DOCTOR.email,
        specialization: auth.user.specialization || stored.specialization || DEMO_DOCTOR.specialization,
      };
    }
    return stored;
  });

  const [appointments, setAppointments] = useState([]);
  const [activity, setActivity] = useState(getStoredDoctorActivity);
  const [availability, setAvailabilityState] = useState(getStoredDoctorAvailability);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3600);
  }, []);

  // Fetch and sync live appointments on mount and when external events occur
  const refreshAppointments = useCallback(async () => {
    try {
      const live = await getLiveDoctorAppointments(auth?.user?.doctorId || 1);
      setAppointments(live);
    } catch (err) {
      console.warn('Failed to load doctor appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [auth?.user?.doctorId]);

  useEffect(() => {
    refreshAppointments();

    const handleUpdate = () => {
      refreshAppointments();
      setActivity(getStoredDoctorActivity());
    };

    window.addEventListener('hn_appointments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('hn_appointments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshAppointments]);

  const log = (text) => {
    const updated = appendDoctorActivity(text);
    setActivity(updated);
  };

  const login = (email) => {
    setSession({ email });
    if (auth?.login) {
      auth.login(email, 'demo-doctor-pass', ROLES.DOCTOR).catch(() => {});
    }
  };

  const logout = () => {
    setSession(null);
    if (auth?.logout) {
      auth.logout();
    }
  };

  const setStatus = async (id, status, rejectionReason = '') => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return;

    // Immediately update local UI state for zero latency
    setAppointments((cur) =>
      cur.map((a) => (a.id === id ? { ...a, status, rejectionReason, requested: null } : a))
    );

    // Persist to storage, backend API, and shared appointment queue
    await persistAppointmentStatus(id, status, rejectionReason);

    const logText =
      status === 'confirmed'
        ? `You accepted the request from ${target.patient}`
        : status === 'rejected'
        ? `You rejected the request from ${target.patient}`
        : `You marked the visit with ${target.patient} as completed`;

    log(logText);

    showToast(
      status === 'confirmed'
        ? `Appointment with ${target.patient} confirmed.`
        : status === 'rejected'
        ? `Request from ${target.patient} rejected.`
        : `Visit with ${target.patient} marked completed.`
    );
  };

  const updateProfile = (next) => {
    setProfile(next);
    saveDoctorProfile(next);
    if (auth?.updateUser) {
      auth.updateUser({
        name: next.name,
        specialization: next.specialization,
        phone: next.phone,
      });
    }
    showToast('Profile updated and saved successfully.');
  };

  const setAvailability = (next) => {
    setAvailabilityState(next);
    saveDoctorAvailability(next);
    showToast('Availability schedule saved and applied to appointments.');
  };

  const value = useMemo(
    () => ({
      session,
      login,
      logout,
      profile,
      updateProfile,
      appointments,
      setStatus,
      activity,
      availability,
      setAvailability,
      toast,
      showToast,
      loading,
      refreshAppointments,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, appointments, activity, availability, toast, loading]
  );

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export const useDoctor = () => useContext(DoctorContext);
