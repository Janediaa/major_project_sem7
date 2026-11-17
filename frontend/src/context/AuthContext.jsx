import { createContext, useContext, useEffect, useState } from 'react';
import { saveCustomDoctor } from '../services/healthcareService';

const AuthContext = createContext(null);

export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
};

export const DEMO_ACCOUNTS = {
  [ROLES.PATIENT]: {
    id: 'demo-patient-1',
    name: 'Alex Sharma',
    email: 'patient@healthnavigator.ai',
    role: ROLES.PATIENT,
    phone: '+91 98765 43210',
    age: '28',
    sex: 'Female',
    avatar: 'AS',
    headline: 'Patient / Healthcare Seeker',
    bio: 'Looking for doctor consultation, appointments, and preventive care tracking.',
  },
  [ROLES.DOCTOR]: {
    id: 'demo-doctor-1',
    name: 'Dr. Ananya Rao',
    email: 'doctor@healthnavigator.ai',
    role: ROLES.DOCTOR,
    phone: '+91 90000 00000',
    specialization: 'Pulmonology',
    hospital: 'Sunrise Chest & Allergy Clinic',
    location: 'Delhi',
    fee: 800,
    doctorId: 1,
    avatar: 'AR',
    headline: 'Consultant Pulmonologist & Clinical Lead',
    bio: 'Focuses on asthma, COPD and long-term cough, with an interest in patient education.',
  },
};

const USER_STORAGE_KEY = 'hn_auth_user';
const TOKEN_STORAGE_KEY = 'hn_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load persisted session on initial mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.warn('Failed to parse stored session:', err);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSession = (userData, token = `tok_${Date.now()}`) => {
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_STORAGE_KEY, token);

    // Keep memory of active accounts for seamless role swapping
    if (userData?.role === ROLES.PATIENT) {
      localStorage.setItem('hn_last_patient_account', JSON.stringify(userData));
    } else if (userData?.role === ROLES.DOCTOR) {
      localStorage.setItem('hn_last_doctor_account', JSON.stringify(userData));
    }
  };

  const switchToRole = (targetRole) => {
    // 1. Snapshot current user in role memory
    if (user && user.role) {
      if (user.role === ROLES.PATIENT) {
        localStorage.setItem('hn_last_patient_account', JSON.stringify(user));
      } else if (user.role === ROLES.DOCTOR) {
        localStorage.setItem('hn_last_doctor_account', JSON.stringify(user));
      }
    }

    // 2. Load target role from memory, fallback to demo account
    if (targetRole === ROLES.PATIENT) {
      try {
        const lastPatient = localStorage.getItem('hn_last_patient_account');
        if (lastPatient) {
          const parsed = JSON.parse(lastPatient);
          if (parsed && parsed.role === ROLES.PATIENT) {
            saveSession(parsed);
            return parsed;
          }
        }
      } catch {}
      const fallback = DEMO_ACCOUNTS[ROLES.PATIENT];
      saveSession(fallback);
      return fallback;
    } else if (targetRole === ROLES.DOCTOR) {
      try {
        const lastDoctor = localStorage.getItem('hn_last_doctor_account');
        if (lastDoctor) {
          const parsed = JSON.parse(lastDoctor);
          if (parsed && parsed.role === ROLES.DOCTOR) {
            saveSession(parsed);
            return parsed;
          }
        }
      } catch {}
      const fallback = DEMO_ACCOUNTS[ROLES.DOCTOR];
      saveSession(fallback);
      return fallback;
    }
  };

  const login = async (email, password, roleHint = ROLES.PATIENT) => {
    // Check against demo accounts first
    const cleanEmail = email.trim().toLowerCase();
    const demo = Object.values(DEMO_ACCOUNTS).find(
      (acc) => acc.email.toLowerCase() === cleanEmail
    );

    if (demo) {
      saveSession(demo);
      return { success: true, user: demo };
    }

    // Check custom registered users in localStorage
    const registeredUsers = JSON.parse(
      localStorage.getItem('hn_registered_users') || '[]'
    );
    const existing = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (existing) {
      if (existing.password && existing.password !== password) {
        throw new Error('Invalid email or password.');
      }
      const { password: _, ...safeUser } = existing;
      saveSession(safeUser);
      return { success: true, user: safeUser };
    }

    // Generic fallback for any entered credentials
    const namePart = email.split('@')[0] || 'User';
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const customUser = {
      id: `usr_${Date.now()}`,
      name: formattedName,
      email: cleanEmail,
      role: roleHint,
      phone: '',
      avatar: formattedName.slice(0, 2).toUpperCase(),
      headline: `${roleHint.charAt(0).toUpperCase() + roleHint.slice(1)} Account`,
      bio: '',
    };

    saveSession(customUser);
    return { success: true, user: customUser };
  };

  const loginAsDemo = (role) => {
    const account = DEMO_ACCOUNTS[role] || DEMO_ACCOUNTS[ROLES.PATIENT];
    saveSession(account);
    return account;
  };

  const register = async ({
    name,
    email,
    password,
    role = ROLES.PATIENT,
    phone = '',
    specialization = '',
    hospital = '',
    city = '',
    fee = 750,
    age = '',
    sex = '',
  }) => {
    const cleanEmail = email.trim().toLowerCase();
    const registeredUsers = JSON.parse(
      localStorage.getItem('hn_registered_users') || '[]'
    );

    if (registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists.');
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password,
      role,
      phone: phone.trim(),
      specialization: specialization.trim(),
      hospital: hospital.trim() || 'Care Plus Multi Specialty Clinic',
      city: city.trim() || 'Delhi',
      fee: fee ? Number(fee) : 750,
      age: age ? String(age).trim() : '',
      sex: sex.trim(),
      avatar: name.trim().replace(/^Dr\.?\s*/i, '').slice(0, 2).toUpperCase(),
      headline:
        role === ROLES.DOCTOR
          ? `Dr. ${name.trim().replace(/^Dr\.?\s*/i, '')} (${specialization || 'General'})`
          : `${role.charAt(0).toUpperCase() + role.slice(1)} Account`,
      bio: '',
    };

    // Save into registered users collection
    registeredUsers.push(newUser);
    localStorage.setItem('hn_registered_users', JSON.stringify(registeredUsers));

    // If new user is a doctor, save to verified doctor directory immediately
    if (role === ROLES.DOCTOR) {
      saveCustomDoctor({
        doctor_id: `doc-${cleanEmail.replace(/[@.]/g, '_')}`,
        doctor_name: name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`,
        doctor_type: specialization.trim() || 'General Medicine',
        specialization: specialization.trim() || 'General Medicine',
        hospital_name: hospital.trim() || 'Care Plus Multi Specialty Clinic',
        city: city.trim() || 'Delhi',
        fees: fee ? Number(fee) : 750,
        phone: phone.trim() || '+91 98765 43210',
        email: cleanEmail,
      });
    } else {
      // If patient, save to patient registry
      try {
        const rawP = localStorage.getItem('hn_patient_registry');
        const pList = rawP ? JSON.parse(rawP) : [];
        const filtered = pList.filter((p) => p.email !== cleanEmail);
        const pEntry = {
          id: newUser.id,
          name: newUser.name,
          email: cleanEmail,
          phone: newUser.phone,
          age: newUser.age,
          sex: newUser.sex,
          registered_at: new Date().toISOString(),
        };
        localStorage.setItem('hn_patient_registry', JSON.stringify([pEntry, ...filtered]));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hn_patients_updated', { detail: pEntry }));
        }
      } catch (pErr) {
        console.warn('Failed to store patient in registry:', pErr);
      }
    }

    // Save session (without password in active session state)
    const { password: _, ...safeUser } = newUser;
    saveSession(safeUser);
    return { success: true, user: safeUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    try {
      localStorage.removeItem('doctor-portal-demo-email');
    } catch {}
  };

  const updateUser = (fields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const hasRole = (...allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(user),
    loading,
    login,
    loginAsDemo,
    switchToRole,
    register,
    logout,
    updateUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
