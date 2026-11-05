import { Info, TriangleAlert } from 'lucide-react';

export default function Notice({ tone = 'info', title, children }) {
  const Icon = tone === 'warning' ? TriangleAlert : Info;
  return (
    <div className={`notice notice--${tone}`} role="note">
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        <p>{children}</p>
      </div>
    </div>
  );
}
