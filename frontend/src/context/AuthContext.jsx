import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
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
    bio: 'Looking for cardiologist consultation and preventive care tracking.',
  },
  [ROLES.DOCTOR]: {
    id: 'demo-doctor-1',
    name: 'Dr. Sarah Jenkins',
    email: 'dr.jenkins@healthnavigator.ai',
    role: ROLES.DOCTOR,
    phone: '+91 98200 12345',
    specialization: 'Cardiologist',
    hospital: 'Apollo Spectra Hospitals',
    doctorId: 1,
    avatar: 'SJ',
    headline: 'Senior Cardiologist & Care Lead',
    bio: 'Cardiology specialist reviewing patient appointment schedules & triage.',
  },
  [ROLES.ADMIN]: {
    id: 'demo-admin-1',
    name: 'Dr. Raymond Holt',
    email: 'admin@healthnavigator.ai',
    role: ROLES.ADMIN,
    phone: '+91 98111 22334',
    department: 'Hospital System Administration',
    avatar: 'RH',
    headline: 'Chief Medical & System Administrator',
    bio: 'Platform superintendent overseeing clinical workflows, schedules & AI agents.',
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
      age: age ? String(age).trim() : '',
      sex: sex.trim(),
      avatar: name.trim().slice(0, 2).toUpperCase(),
      headline:
        role === ROLES.DOCTOR
          ? `Dr. ${name.trim()} (${specialization || 'General'})`
          : `${role.charAt(0).toUpperCase() + role.slice(1)} Account`,
      bio: '',
    };

    // Save into registered users collection
    registeredUsers.push(newUser);
    localStorage.setItem('hn_registered_users', JSON.stringify(registeredUsers));

    // Save session (without password in active session state)
    const { password: _, ...safeUser } = newUser;
    saveSession(safeUser);
    return { success: true, user: safeUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
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
