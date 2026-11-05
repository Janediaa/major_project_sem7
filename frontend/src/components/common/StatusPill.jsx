import { STATUS } from '../../config/modules';

export default function StatusPill({ status, long = false }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <span className={`status-pill status-pill--${status}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {long ? s.label : s.short}
    </span>
  );
}
