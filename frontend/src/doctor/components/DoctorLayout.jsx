import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import DoctorSidebar from './DoctorSidebar';
import DoctorTopbar from './DoctorTopbar';
import { useDoctor } from '../DoctorContext';

export default function DoctorLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const { toast } = useDoctor();

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <DoctorSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div className="app-main">
        <DoctorTopbar onMenu={() => setNavOpen(true)} />
        <main id="main" className="app-content"><Outlet /></main>
      </div>
      {toast && (
        <div className="dr-toast" role="status">
          <CircleCheck size={18} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
