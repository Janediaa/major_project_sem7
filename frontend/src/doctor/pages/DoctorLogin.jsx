import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import Logo from '../../components/layout/Logo';
import Notice from '../../components/common/Notice';
import { useDoctor } from '../DoctorContext';

const REMEMBER_KEY = 'doctor-portal-demo-email';

export default function DoctorLogin() {
  const { login } = useDoctor();
  const navigate = useNavigate();
  const saved = (() => { try { return localStorage.getItem(REMEMBER_KEY) ?? ''; } catch { return ''; } })();

  const [email, setEmail] = useState(saved);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(Boolean(saved));
  const [errors, setErrors] = useState({});
  const [forgot, setForgot] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) err.email = 'Enter a valid email address.';
    if (!password) err.password = 'Enter your password.';
    setErrors(err);
    if (Object.keys(err).length) return;
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* storage unavailable: ignore */ }
    login(email);
    navigate('/doctor', { replace: true });
  };

  return (
    <div className="dr-login">
      <section className="dr-login__brand" aria-hidden="true">
        <div className="dr-login__brand-inner">
          <Logo size={44} />
          <h1>Care for patients, without the scheduling overhead.</h1>
          <p>Review requests, manage your calendar and keep your availability up to date from one place.</p>
          <ul>
            <li><ShieldCheck size={18} /> Built for clinicians</li>
            <li><ShieldCheck size={18} /> Part of Healthcare Navigator</li>
          </ul>
        </div>
      </section>

      <section className="dr-login__panel">
        <form className="dr-login__form" onSubmit={submit} noValidate>
          <h2>Doctor sign in</h2>
          <p className="muted">Use your clinic email to continue.</p>

          <Notice tone="info" title="Clinician Authentication">
            Sign in with your verified doctor account or clinic email to access your outpatient schedule, patient requests, and availability controls.
          </Notice>

          <label className="stack">
            <span className="label">Email</span>
            <span className="field field--icon">
              <Mail size={18} aria-hidden="true" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@clinic.example" autoComplete="email" aria-invalid={!!errors.email} />
            </span>
            {errors.email && <span className="form-error" role="alert">{errors.email}</span>}
          </label>

          <label className="stack">
            <span className="label">Password</span>
            <span className="field field--icon">
              <Lock size={18} aria-hidden="true" />
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" aria-invalid={!!errors.password} />
              <button type="button" className="dr-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            {errors.password && <span className="form-error" role="alert">{errors.password}</span>}
          </label>

          <div className="dr-login__row">
            <label className="toggle"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
            <button type="button" className="dr-link" onClick={() => setForgot(true)}>Forgot password?</button>
          </div>
          {forgot && <p className="muted" role="status">Password reset is not available in the demo.</p>}

          <button className="btn btn--primary btn--block" type="submit">Sign in</button>
        </form>
      </section>
    </div>
  );
}
