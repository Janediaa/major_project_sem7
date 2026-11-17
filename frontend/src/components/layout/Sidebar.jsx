import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Stethoscope, X } from 'lucide-react';
import { MODULES, STATUS } from '../../config/modules';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';

export default function Sidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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

        {role === 'doctor' && (
          <NavLink
            to="/doctor"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            style={{ marginTop: '0.5rem', background: '#ecfdf5', color: '#047857', fontWeight: 600 }}
          >
            <Stethoscope size={19} aria-hidden="true" />
            <span>Doctor Portal</span>
          </NavLink>
        )}
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
