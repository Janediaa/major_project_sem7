export default function StatCard({ icon: Icon, label, value, tone = 'navy', hint }) {
  return (
    <div className={`dr-stat dr-stat--${tone}`}>
      <span className="dr-stat__icon"><Icon size={20} aria-hidden="true" /></span>
      <div>
        <dd>{value}</dd>
        <dt>{label}</dt>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}
