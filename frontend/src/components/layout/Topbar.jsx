import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react';
import { MODULES } from '../../config/modules';
import { NOTIFICATIONS } from '../../data/sampleData';
import { ROLES, useAuth } from '../../context/AuthContext';
import SampleBadge from '../common/SampleBadge';

export default function Topbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role, logout, loginAsDemo } = useAuth();
  const current = MODULES.find((m) => m.path === pathname) ?? MODULES[0];

  const [query, setQuery] = useState('');
  const [miss, setMiss] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const bellRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!bellOpen && !profileOpen) return undefined;
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setBellOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [bellOpen, profileOpen]);

  const jump = (e) => {
    e.preventDefault();
    const t = query.trim().toLowerCase();
    if (!t) return;
    const hit = MODULES.find(
      (m) => m.label.toLowerCase().includes(t) || m.keywords.some((k) => k.includes(t) || t.includes(k))
    );
    if (hit) {
      navigate(hit.path);
      setQuery('');
      setMiss(false);
    } else {
      setMiss(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="topbar">
      <button className="icon-btn topbar__menu" onClick={onMenu} aria-label="Open menu">
        <Menu size={22} />
      </button>

      <div className="topbar__title">
        <span className="topbar__crumb">Healthcare Navigator</span>
        <span className="topbar__page">{current.label}</span>
      </div>

      <form className="topbar__search" onSubmit={jump} role="search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMiss(false);
          }}
          placeholder="Jump to a page, e.g. “book” or “symptoms”"
          aria-label="Jump to a page"
        />
        {miss && <span className="topbar__miss" role="status">No matching page</span>}
      </form>

      <div className="topbar__actions">
        <div className="popover-wrap" ref={bellRef}>
          <button
            className="icon-btn"
            onClick={() => setBellOpen((o) => !o)}
            aria-label="Notifications"
            aria-expanded={bellOpen}
          >
            <Bell size={20} />
          </button>
          {bellOpen && (
            <div className="popover" role="dialog" aria-label="Notifications">
              <div className="popover__head">
                <strong>Notifications</strong>
                <SampleBadge>Placeholder</SampleBadge>
              </div>
              <ul>
                {NOTIFICATIONS.map((n) => (
                  <li key={n.id}>{n.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="popover-wrap" ref={profileRef}>
          <button
            type="button"
            className="profile"
            onClick={() => setProfileOpen((o) => !o)}
            aria-label="User profile and account settings"
            aria-expanded={profileOpen}
          >
            <span
              className={`profile__avatar profile__avatar--${role || 'patient'}`}
              aria-hidden="true"
            >
              {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
            </span>
            <span className="profile__text">
              <strong>{user?.name || 'Authorized User'}</strong>
              <small>
                <span className={`role-badge role-badge--${role || 'patient'}`}>
                  {role || 'User'}
                </span>
                <ChevronDown size={12} />
              </small>
            </span>
          </button>

          {profileOpen && (
            <div className="profile-menu" role="dialog" aria-label="Account details">
              <div className="profile-menu__user">
                <span
                  className={`profile__avatar profile__avatar--${role || 'patient'}`}
                  aria-hidden="true"
                >
                  {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
                </span>
                <div className="profile-menu__user-info">
                  <strong>{user?.name || 'Healthcare User'}</strong>
                  <span>{user?.email || 'user@healthnavigator.ai'}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginTop: '2px' }}>
                    {user?.headline || `${role} account`}
                  </span>
                </div>
              </div>

              <div className="profile-menu__section-title">
                <Sparkles size={11} style={{ marginRight: '4px', display: 'inline' }} />
                Switch Evaluation Role
              </div>

              <div className="profile-menu__switchers">
                <button
                  type="button"
                  className={`profile-menu__switch-btn ${role === ROLES.PATIENT ? 'profile-menu__switch-btn--active' : ''}`}
                  onClick={() => {
                    loginAsDemo(ROLES.PATIENT);
                    setProfileOpen(false);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} /> Patient (Alex)
                  </span>
                  {role === ROLES.PATIENT && <span style={{ fontSize: '0.7rem', color: 'var(--teal-600)' }}>Active</span>}
                </button>

                <button
                  type="button"
                  className={`profile-menu__switch-btn ${role === ROLES.DOCTOR ? 'profile-menu__switch-btn--active' : ''}`}
                  onClick={() => {
                    loginAsDemo(ROLES.DOCTOR);
                    setProfileOpen(false);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={14} /> Doctor (Dr. Jenkins)
                  </span>
                  {role === ROLES.DOCTOR && <span style={{ fontSize: '0.7rem', color: 'var(--teal-600)' }}>Active</span>}
                </button>

                <button
                  type="button"
                  className={`profile-menu__switch-btn ${role === ROLES.ADMIN ? 'profile-menu__switch-btn--active' : ''}`}
                  onClick={() => {
                    loginAsDemo(ROLES.ADMIN);
                    setProfileOpen(false);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} /> Admin (Hospital Lead)
                  </span>
                  {role === ROLES.ADMIN && <span style={{ fontSize: '0.7rem', color: 'var(--teal-600)' }}>Active</span>}
                </button>
              </div>

              <button
                type="button"
                className="profile-menu__logout"
                onClick={handleLogout}
              >
                <LogOut size={14} /> Sign Out of Portal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
