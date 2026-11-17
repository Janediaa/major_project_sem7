import { STATUS_LABELS } from '../data/mockDoctorData';

export default function StatusBadge({ status }) {
  return (
    <span className={`dr-status dr-status--${status}`}>
      <i aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
