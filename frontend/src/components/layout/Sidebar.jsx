import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Stethoscope, X } from 'lucide-react';
import { MODULES, STATUS } from '../../config/modules';
import { ROLES, useAuth } from '../../context/AuthContext';
import Logo from './Logo';

export default function Sidebar({ open, onClose }) {
  const { user, role, logout, switchToRole, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSwapToDoctor = (e) => {
    e.preventDefault();
    if (switchToRole) {
      switchToRole(ROLES.DOCTOR);
    } else if (loginAsDemo) {
      loginAsDemo(ROLES.DOCTOR);
    }
    navigate('/doctor');
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <Logo />
        <div>
          <span className="sidebar__name">Healthcare Navigator</span>
          <span className="sidebar__tag">Multi-agent care assistant</span>
        </div>
        <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close navigation menu">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar__nav">
        {MODULES.map(({ id, label, path, icon: Icon, status }) => (
          <NavLink
            key={id}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            {status && (
              <span
                className={`nav-link__dot nav-link__dot--${status}`}
                title={STATUS[status].label}
                aria-label={STATUS[status].label}
              />
            )}
          </NavLink>
        ))}

        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="nav-link"
            style={{
              width: '100%',
              textAlign: 'left',
              background: '#f0fdf4',
              color: '#047857',
              fontWeight: 600,
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.75rem',
            }}
            onClick={handleSwapToDoctor}
            title="Swap to Doctor OPD Console"
          >
            <Stethoscope size={19} aria-hidden="true" />
            <span style={{ flex: 1 }}>Doctor Portal</span>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              Swap &rarr;
            </span>
          </button>
        </div>
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__user-info">
          <span
            className={`sidebar__user-avatar sidebar__user-avatar--${role || 'patient'}`}
            aria-hidden="true"
          >
            {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
          </span>
          <div className="sidebar__user-details">
            <span className="sidebar__user-name">{user?.name || 'Healthcare User'}</span>
            <span className={`role-badge role-badge--${role || 'patient'}`} style={{ alignSelf: 'flex-start' }}>
              {role || 'User'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar__logout-btn"
          onClick={handleLogout}
          title="Sign out of Healthcare Navigator"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
