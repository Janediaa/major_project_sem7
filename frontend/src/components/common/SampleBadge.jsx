import { FlaskConical } from 'lucide-react';

export default function SampleBadge({ children = 'Sample data' }) {
  return (
    <span className="sample-badge" title="Invented for this prototype. Replaced by real data once the agent is connected.">
      <FlaskConical size={12} aria-hidden="true" />
      {children}
    </span>
  );
}
