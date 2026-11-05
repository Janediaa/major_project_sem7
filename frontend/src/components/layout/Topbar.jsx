import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search } from 'lucide-react';
import { MODULES } from '../../config/modules';
import { NOTIFICATIONS } from '../../data/sampleData';
import SampleBadge from '../common/SampleBadge';

export default function Topbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = MODULES.find((m) => m.path === pathname) ?? MODULES[0];

  const [query, setQuery] = useState('');
  const [miss, setMiss] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setBellOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [bellOpen]);

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

        <div className="profile" title="Sample profile. Sign-in is not part of this prototype.">
          <span className="profile__avatar" aria-hidden="true">G</span>
          <span className="profile__text">
            <strong>Guest</strong>
            <small>Sample profile</small>
          </span>
        </div>
      </div>
    </div>
  );
}
