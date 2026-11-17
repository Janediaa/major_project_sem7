import { toISO, addDays } from '../data/mockDoctorData';

// Counts non-rejected appointments for each day of the current week (Mon–Sun).
export default function WeeklyChart({ appointments }) {
  const now = new Date();
  const monday = addDays(-((now.getDay() + 6) % 7), now);
  const today = toISO(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(i, monday);
    const iso = toISO(d);
    return {
      iso,
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      count: appointments.filter((a) => a.date === iso && a.status !== 'rejected').length,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);

  return (
    <figure className="dr-chart" aria-label={`Appointments this week: ${total} in total`}>
      <div className="dr-chart__bars">
        {days.map((d) => (
          <div key={d.iso} className={`dr-chart__col ${d.iso === today ? 'is-today' : ''}`}>
            <span className="dr-chart__val">{d.count}</span>
            <span className="dr-chart__bar" style={{ height: `${(d.count / max) * 100}%` }} />
            <span className="dr-chart__label">{d.label}</span>
          </div>
        ))}
      </div>
      <figcaption>{total} appointments this week (rejected ones excluded)</figcaption>
    </figure>
  );
}
