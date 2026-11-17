import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
} from 'lucide-react';
import Logo from '../components/layout/Logo';
import { DEMO_ACCOUNTS, ROLES, useAuth } from '../context/AuthContext';
import '../styles/auth.css';

export default function Auth() {
  const { login, register, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState(ROLES.PATIENT);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('Cardiology');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Female');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/';

  const handleDemoSelect = (roleKey) => {
    loginAsDemo(roleKey);
    navigate(destination, { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password, selectedRole);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        role: selectedRole,
        phone,
        specialization: selectedRole === ROLES.DOCTOR ? specialization : '',
        age: selectedRole === ROLES.PATIENT ? age : '',
        sex: selectedRole === ROLES.PATIENT ? sex : '',
      });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Header */}
        <header className="auth-header">
          <div className="auth-header__logo">
            <Logo size={48} />
          </div>
          <h1>Healthcare Navigator</h1>
          <p>
            Agentic AI care assistant coordinating doctor discovery, verified appointments, WHO
            triage &amp; insurance intelligence.
          </p>
        </header>

        {/* 1-Click Quick Demo Sign In */}
        <section className="auth-demo-section" aria-label="One-click demo login">
          <div className="auth-demo-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} /> One-Click Evaluation Logins
            </span>
            <span className="auth-demo-badge">Fast Access</span>
          </div>

          <div className="auth-demo-grid">
            <button
              type="button"
              className="auth-demo-btn auth-demo-btn--patient"
              onClick={() => handleDemoSelect(ROLES.PATIENT)}
              title="Sign in as Patient Alex Sharma"
            >
              <div className="auth-demo-btn__icon">
                <User size={16} />
              </div>
              <strong>Patient</strong>
              <span>Alex Sharma</span>
            </button>

            <button
              type="button"
              className="auth-demo-btn auth-demo-btn--doctor"
              onClick={() => handleDemoSelect(ROLES.DOCTOR)}
              title="Sign in as Dr. Sarah Jenkins (Cardiologist)"
            >
              <div className="auth-demo-btn__icon">
                <Stethoscope size={16} />
              </div>
              <strong>Doctor</strong>
              <span>Dr. Jenkins</span>
            </button>

            <button
              type="button"
              className="auth-demo-btn auth-demo-btn--admin"
              onClick={() => handleDemoSelect(ROLES.ADMIN)}
              title="Sign in as Hospital Administrator"
            >
              <div className="auth-demo-btn__icon">
                <ShieldCheck size={16} />
              </div>
              <strong>Admin</strong>
              <span>Hospital Lead</span>
            </button>
          </div>
        </section>

        {/* Mode Switcher Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="e.g. patient@healthnavigator.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label>Role</label>
              <div className="auth-role-grid">
                <button
                  type="button"
                  className={`auth-role-card ${selectedRole === ROLES.PATIENT ? 'auth-role-card--active' : ''}`}
                  onClick={() => setSelectedRole(ROLES.PATIENT)}
                >
                  <User size={16} />
                  <strong>Patient</strong>
                  <small>Care seeker</small>
                </button>

                <button
                  type="button"
                  className={`auth-role-card ${selectedRole === ROLES.DOCTOR ? 'auth-role-card--active' : ''}`}
                  onClick={() => setSelectedRole(ROLES.DOCTOR)}
                >
                  <Stethoscope size={16} />
                  <strong>Doctor</strong>
                  <small>Care provider</small>
                </button>

                <button
                  type="button"
                  className={`auth-role-card ${selectedRole === ROLES.ADMIN ? 'auth-role-card--active' : ''}`}
                  onClick={() => setSelectedRole(ROLES.ADMIN)}
                >
                  <ShieldCheck size={16} />
                  <strong>Admin</strong>
                  <small>System manager</small>
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign In to Portal'}
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="auth-field">
              <label htmlFor="reg-name">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  className="auth-input"
                  placeholder="e.g. Alex Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-phone">Phone Number (Optional)</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input
                  id="reg-phone"
                  type="tel"
                  className="auth-input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="auth-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label>Select Your Account Type</label>
              <div className="auth-role-grid">
                <button
                  type="button"
                  className={`auth-role-card ${selectedRole === ROLES.PATIENT ? 'auth-role-card--active' : ''}`}
                  onClick={() => setSelectedRole(ROLES.PATIENT)}
                >
                  <User size={16} />
                  <strong>Patient</strong>
                  <small>Book &amp; search</small>
                </button>

                <button
                  type="button"
                  className={`auth-role-card ${selectedRole === ROLES.DOCTOR ? 'auth-role-card--active' : ''}`}
                  onClick={() => setSelectedRole(ROLES.DOCTOR)}
                >
                  <Stethoscope size={16} />
                  <strong>Doctor</strong>
                  <small>Manage clinic</small>
                </button>

                <button
                  type="button"
                  className={`auth-role-card ${selectedRole === ROLES.ADMIN ? 'auth-role-card--active' : ''}`}
                  onClick={() => setSelectedRole(ROLES.ADMIN)}
                >
                  <ShieldCheck size={16} />
                  <strong>Admin</strong>
                  <small>Full control</small>
                </button>
              </div>
            </div>

            {selectedRole === ROLES.DOCTOR && (
              <div className="auth-field">
                <label htmlFor="reg-specialization">Medical Specialization</label>
                <div className="auth-input-wrap">
                  <Stethoscope size={16} className="auth-input-icon" />
                  <input
                    id="reg-specialization"
                    type="text"
                    required
                    className="auth-input"
                    placeholder="e.g. Cardiology, Neurology, General Physician"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                </div>
              </div>
            )}

            {selectedRole === ROLES.PATIENT && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="auth-field">
                  <label htmlFor="reg-age">Age (Optional)</label>
                  <input
                    id="reg-age"
                    type="number"
                    min="1"
                    max="120"
                    className="auth-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="e.g. 28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-sex">Sex</label>
                  <select
                    id="reg-sex"
                    className="auth-input"
                    style={{ paddingLeft: '0.85rem' }}
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Complete Registration'}
              <UserCheck size={16} />
            </button>
          </form>
        )}

        <footer className="auth-footer">
          <span>Protected by Healthcare Navigator Role-Based Authorization</span>
        </footer>
      </div>
    </div>
  );
}
