import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search } from 'lucide-react';
import { useDoctor } from '../DoctorContext';
import { ROLES, useAuth } from '../../context/AuthContext';

const TITLES = {
  '/doctor': 'Dashboard',
  '/doctor/appointments': 'My Appointments',
  '/doctor/requests': 'Appointment Requests',
  '/doctor/patients': 'Patients Directory',
  '/doctor/availability': 'My Availability',
  '/doctor/profile': 'My Profile',
};

export default function DoctorTopbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile, appointments } = useDoctor();
  const [q, setQ] = useState('');
  const pending = appointments.filter((a) => a.status === 'pending').length;

  const search = (e) => {
    e.preventDefault();
    const t = q.trim();
    if (t) navigate(`/doctor/appointments?q=${encodeURIComponent(t)}`);
    setQ('');
  };

  const handleSwapToPatient = (e) => {
    e.preventDefault();
    if (auth?.switchToRole) {
      auth.switchToRole(ROLES.PATIENT);
    } else if (auth?.loginAsDemo) {
      auth.loginAsDemo(ROLES.PATIENT);
    }
    navigate('/');
  };

  return (
    <div className="topbar">
      <button className="icon-btn topbar__menu" onClick={onMenu} aria-label="Open menu"><Menu size={22} /></button>
      <div className="topbar__title">
        <span className="topbar__crumb">Doctor Portal</span>
        <span className="topbar__page">{TITLES[pathname] ?? 'Doctor Portal'}</span>
      </div>

      <form className="topbar__search" onSubmit={search} role="search">
        <Search size={17} aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients in appointments" aria-label="Search patients" />
      </form>

      <div className="topbar__actions">
        <button
          type="button"
          onClick={handleSwapToPatient}
          className="btn btn--ghost btn--sm"
          style={{
            fontSize: '0.8125rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--r-full)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: 500,
          }}
          title="Swap to Patient Portal"
        >
          Patient View &rarr;
        </button>
        <Link to="/doctor/requests" className="icon-btn dr-bell" aria-label={`Appointment requests, ${pending} pending`}>
          <Bell size={20} />
          {pending > 0 && <span className="dr-bell__dot">{pending}</span>}
        </Link>
        <Link to="/doctor/profile" className="profile" title="Doctor Profile">
          <span className="profile__avatar" aria-hidden="true">{profile.name.replace('Dr. ', '').split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
          <span className="profile__text">
            <strong>{profile.name}</strong>
            <small>{profile.specialization}</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
