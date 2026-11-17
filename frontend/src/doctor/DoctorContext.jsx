import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ROLES, useAuth } from '../context/AuthContext';
import {
  DEMO_DOCTOR,
  INITIAL_ACTIVITY,
  INITIAL_AVAILABILITY,
  makeAppointments,
} from './data/mockDoctorData';

// State for the Doctor Portal. Integrates with AuthContext for unified authentication.
const DoctorContext = createContext(null);

export function DoctorProvider({ children }) {
  const auth = useAuth();
  const [session, setSession] = useState(() => {
    if (auth?.user && auth.user.role === ROLES.DOCTOR) {
      return { email: auth.user.email };
    }
    return null;
  });

  useEffect(() => {
    if (auth?.user && auth.user.role === ROLES.DOCTOR) {
      setSession({ email: auth.user.email });
    }
  }, [auth?.user]);

  const [profile, setProfile] = useState(() => {
    if (auth?.user && auth.user.role === ROLES.DOCTOR && auth.user.name) {
      return {
        ...DEMO_DOCTOR,
        name: auth.user.name.startsWith('Dr.') ? auth.user.name : `Dr. ${auth.user.name}`,
        email: auth.user.email || DEMO_DOCTOR.email,
        specialization: auth.user.specialization || DEMO_DOCTOR.specialization,
      };
    }
    return DEMO_DOCTOR;
  });

  const [appointments, setAppointments] = useState(makeAppointments);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);
  const [toast, setToast] = useState('');
  const timer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3600);
  }, []);

  const log = (text) => setActivity((cur) => [{ id: `ac-${Date.now()}`, text, time: 'Just now' }, ...cur].slice(0, 8));

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

  const setStatus = (id, status, rejectionReason = '') => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return;
    setAppointments((cur) => cur.map((a) => (a.id === id ? { ...a, status, rejectionReason, requested: null } : a)));
    log(
      status === 'confirmed' ? `You accepted the request from ${target.patient}`
        : status === 'rejected' ? `You rejected the request from ${target.patient}`
        : `You marked the visit with ${target.patient} as completed`
    );
    showToast(
      status === 'confirmed' ? `Appointment with ${target.patient} confirmed.`
        : status === 'rejected' ? `Request from ${target.patient} rejected.`
        : `Visit with ${target.patient} marked completed.`
    );
  };

  const updateProfile = (next) => {
    setProfile(next);
    showToast('Profile updated (demo, saved locally in session).');
  };

  const value = useMemo(
    () => ({ session, login, logout, profile, updateProfile, appointments, setStatus, activity, availability, setAvailability, toast, showToast }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, appointments, activity, availability, toast]
  );
  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export const useDoctor = () => useContext(DoctorContext);
