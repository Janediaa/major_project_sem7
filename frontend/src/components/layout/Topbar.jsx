import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  Clock,
  History,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { MODULES } from '../../config/modules';
import { NOTIFICATIONS } from '../../data/sampleData';
import { ROLES, useAuth } from '../../context/AuthContext';
import {
  clearAllSearchHistory,
  loadSearchHistory,
  removeSearchItem,
  saveSearchItem,
} from '../../utils/searchHistory';
import SampleBadge from '../common/SampleBadge';

const POPULAR_SEARCHES = [
  { label: 'Cardiologists in Delhi', path: '/doctor-hospital', tag: 'Doctors' },
  { label: 'Book OPD visit slot', path: '/appointments', tag: 'Booking' },
  { label: 'Check emergency symptoms', path: '/triage', tag: 'Triage' },
  { label: 'IRDAI policy waiting period', path: '/insurance', tag: 'Insurance' },
  { label: 'WHO clinical guidelines', path: '/medical-knowledge', tag: 'RAG' },
];

export default function Topbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role, logout, loginAsDemo } = useAuth();
  const current = MODULES.find((m) => m.path === pathname) ?? MODULES[0];

  const [query, setQuery] = useState('');
  const [miss, setMiss] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const searchWrapRef = useRef(null);

  // Load search history whenever user changes or on initial mount
  useEffect(() => {
    setHistory(loadSearchHistory(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!bellOpen && !profileOpen && !searchOpen) return undefined;
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setSearchOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setBellOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [bellOpen, profileOpen, searchOpen]);

  const determineTarget = (text) => {
    const t = text.trim().toLowerCase();
    const hit = MODULES.find(
      (m) => m.label.toLowerCase().includes(t) || m.keywords.some((k) => k.includes(t) || t.includes(k))
    );
    if (hit) return hit.path;
    if (t.includes('symptom') || t.includes('urgent') || t.includes('emergency') || t.includes('pain') || t.includes('fever')) {
      return '/triage';
    }
    if (t.includes('policy') || t.includes('claim') || t.includes('insurance') || t.includes('waiting') || t.includes('copay')) {
      return '/insurance';
    }
    if (t.includes('book') || t.includes('slot') || t.includes('visit') || t.includes('schedule') || t.includes('appointment')) {
      return '/appointments';
    }
    if (t.includes('who') || t.includes('rag') || t.includes('guideline') || t.includes('cancer') || t.includes('diabetes')) {
      return '/medical-knowledge';
    }
    return '/doctor-hospital';
  };

  const executeSearch = (searchText, directPath = null) => {
    const clean = searchText.trim();
    if (!clean) return;

    const targetPath = directPath || determineTarget(clean);
    const updated = saveSearchItem(user?.id, clean, targetPath);
    if (updated) setHistory(updated);

    navigate(targetPath);
    setQuery('');
    setMiss(false);
    setSearchOpen(false);
  };

  const jump = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleDeleteHistory = (e, itemQuery) => {
    e.stopPropagation();
    const updated = removeSearchItem(user?.id, itemQuery);
    setHistory(updated);
  };

  const handleClearAllHistory = (e) => {
    e.stopPropagation();
    const updated = clearAllSearchHistory(user?.id);
    setHistory(updated);
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

      <div className="search-wrap" ref={searchWrapRef} style={{ position: 'relative', marginLeft: 'auto' }}>
        <form className="topbar__search" onSubmit={jump} role="search" style={{ marginLeft: 0 }}>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setMiss(false);
              setSearchOpen(true);
            }}
            placeholder="Search care, e.g. “Cardiologist” or “book”"
            aria-label="Search healthcare portal"
            autoComplete="off"
          />
          {miss && <span className="topbar__miss" role="status">No matching page</span>}
        </form>

        {searchOpen && (
          <div className="search-dropdown" role="dialog" aria-label="Search history and suggestions">
            {/* Recent Searches Section (Google-Style) */}
            {history.length > 0 && (
              <>
                <div className="search-dropdown__header">
                  <span className="search-dropdown__header-title">
                    <History size={13} /> Recent Searches
                  </span>
                  <button
                    type="button"
                    className="search-dropdown__clear-btn"
                    onClick={handleClearAllHistory}
                  >
                    Clear history
                  </button>
                </div>
                <ul className="search-dropdown__list">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="search-dropdown__item"
                      onClick={() => executeSearch(item.query, item.path)}
                    >
                      <Clock size={14} className="search-dropdown__item-icon" />
                      <span className="search-dropdown__item-query">{item.query}</span>
                      {item.timestamp && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginRight: '4px' }}>
                          {item.timestamp}
                        </span>
                      )}
                      <button
                        type="button"
                        className="search-dropdown__delete"
                        title="Remove from history"
                        aria-label={`Remove ${item.query} from history`}
                        onClick={(e) => handleDeleteHistory(e, item.query)}
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Quick Suggestions & Destinations */}
            <div className="search-dropdown__header">
              <span className="search-dropdown__header-title">
                <Sparkles size={13} /> Suggested &amp; Shortcuts
              </span>
            </div>
            <ul className="search-dropdown__list">
              {POPULAR_SEARCHES.map((item, idx) => (
                <li
                  key={idx}
                  className="search-dropdown__item"
                  onClick={() => executeSearch(item.label, item.path)}
                >
                  <Search size={14} className="search-dropdown__item-icon" />
                  <span className="search-dropdown__item-query">{item.label}</span>
                  <span className="search-dropdown__item-badge">{item.tag}</span>
                  <ArrowUpRight size={13} style={{ color: 'var(--ink-faint)', marginLeft: '4px' }} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
