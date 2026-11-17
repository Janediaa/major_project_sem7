import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, footer, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose; // always call the latest handler without re-running the effect

  useEffect(() => {
    const prev = document.activeElement;
    // Move focus into the dialog unless a field inside already took it (e.g. autoFocus).
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="dr-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dr-modal ${wide ? 'dr-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="dr-modal__head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="dr-modal__body">{children}</div>
        {footer && <div className="dr-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
