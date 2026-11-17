import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, CalendarCheck2, CalendarClock, Inbox, LayoutDashboard, LogOut, UserRound, Users, X } from 'lucide-react';
import Logo from '../../components/layout/Logo';
import { useDoctor } from '../DoctorContext';
import { ROLES, useAuth } from '../../context/AuthContext';

const LINKS = [
  { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/doctor/appointments', label: 'My Appointments', icon: CalendarCheck2 },
  { to: '/doctor/requests', label: 'Appointment Requests', icon: Inbox, badge: true },
  { to: '/doctor/patients', label: 'Patients', icon: Users },
  { to: '/doctor/availability', label: 'My Availability', icon: CalendarClock },
  { to: '/doctor/profile', label: 'My Profile', icon: UserRound },
];

export default function DoctorSidebar({ open, onClose }) {
  const { appointments, logout } = useDoctor();
  const auth = useAuth();
  const navigate = useNavigate();
  const pending = appointments.filter((a) => a.status === 'pending').length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSwapToPatient = (e) => {
    e.preventDefault();
    if (auth?.switchToRole) {
      auth.switchToRole(ROLES.PATIENT);
    } else if (auth?.loginAsDemo) {
      auth.loginAsDemo(ROLES.PATIENT);
    }
    navigate('/');
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar dr-sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Doctor portal navigation">
      <div className="sidebar__brand">
        <Logo />
        <div>
          <span className="sidebar__name">Healthcare Navigator</span>
          <span className="sidebar__tag">Doctor Portal</span>
        </div>
        <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
      </div>

      <nav className="sidebar__nav">
        {LINKS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            {badge && pending > 0 && <span className="dr-count" aria-label={`${pending} pending`}>{pending}</span>}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={handleSwapToPatient}
          className="nav-link"
          style={{
            marginTop: '0.5rem',
            borderTop: '1px solid var(--border)',
            background: 'transparent',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
          title="Swap to Patient Portal"
        >
          <ArrowLeftRight size={19} aria-hidden="true" />
          <span style={{ flex: 1 }}>Patient Portal</span>
          <span style={{ fontSize: '0.75rem', background: 'var(--wash, #f1f5f9)', color: 'var(--ink, #334155)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
            Swap &rarr;
          </span>
        </button>

        <button type="button" className="nav-link dr-logout" onClick={handleLogout}>
          <LogOut size={19} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </nav>

      <div className="sidebar__foot">
        <p><strong>Clinical OPD Console</strong></p>
        <p>Review patient consultations, requests and real-time scheduling from your doctor dashboard.</p>
      </div>
    </aside>
  );
}
