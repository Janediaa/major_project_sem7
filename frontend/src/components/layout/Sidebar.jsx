import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { MODULES, STATUS } from '../../config/modules';
import Logo from './Logo';

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <Logo />
        <div>
          <span className="sidebar__name">Healthcare Navigator</span>
          <span className="sidebar__tag">Multi-agent care assistant</span>
        </div>
        
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
      </nav>

     
    </aside>
  );
}
