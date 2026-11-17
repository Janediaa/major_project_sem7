import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CalendarCheck2, CheckCheck, Clock3, ListChecks, Inbox } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import WeeklyChart from '../components/WeeklyChart';
import { useDoctor } from '../DoctorContext';
import { formatDate, timeToMinutes, todayISO, STATUS_LABELS } from '../data/mockDoctorData';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const byDateTime = (a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time);

export default function DoctorDashboard() {
  const { profile, appointments, activity } = useDoctor();
  const today = todayISO();

  const count = (s) => appointments.filter((a) => a.status === s).length;
  const total = appointments.length;
  const todays = appointments.filter((a) => a.date === today && a.status !== 'rejected').sort(byDateTime);
  const upcoming = appointments.filter((a) => a.status === 'confirmed' && a.date > today).sort(byDateTime).slice(0, 4);
  const overview = ['confirmed', 'pending', 'completed', 'rejected'];

  return (
    <div className="page">
      <PageHeader
        title={`${greeting()}, ${profile.name}`}
        description={`You have ${todays.length} ${todays.length === 1 ? 'appointment' : 'appointments'} today and ${count('pending')} pending ${count('pending') === 1 ? 'request' : 'requests'}.`}
        badge={
          <span className="role-badge role-badge--doctor" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Activity size={12} /> Live OPD Console
          </span>
        }
        actions={<Link to="/doctor/requests" className="btn btn--primary"><Inbox size={17} /> Review requests</Link>}
      />

      <dl className="dr-stats">
        <StatCard icon={ListChecks} label="Total appointments" value={total} tone="navy" />
        <StatCard icon={Clock3} label="Pending requests" value={count('pending')} tone="amber" hint="Needs your response" />
        <StatCard icon={CalendarCheck2} label="Confirmed" value={count('confirmed')} tone="teal" />
        <StatCard icon={CheckCheck} label="Completed" value={count('completed')} tone="green" />
      </dl>

      <div className="dr-grid">
        <section className="panel" aria-labelledby="today-h">
          <div className="dr-panel-head">
            <h2 id="today-h">Today’s schedule</h2>
            <span className="muted">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          {todays.length === 0 ? (
            <div className="empty empty--inline"><h3>Nothing scheduled today</h3><p>Accepted appointments for today will show here.</p></div>
          ) : (
            <ol className="dr-timeline">
              {todays.map((a) => (
                <li key={a.id} className={`dr-timeline__item dr-timeline__item--${a.status}`}>
                  <time>{a.time}</time>
                  <div>
                    <strong>{a.patient}</strong>
                    <small>{a.reason}</small>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel" aria-labelledby="week-h">
          <div className="dr-panel-head"><h2 id="week-h">Weekly appointments</h2></div>
          <WeeklyChart appointments={appointments} />
        </section>

        <section className="panel" aria-labelledby="ov-h">
          <div className="dr-panel-head"><h2 id="ov-h">Appointment overview</h2></div>
          <div className="dr-stack-bar" role="img" aria-label="Share of appointments by status">
            {overview.map((s) => count(s) > 0 && <span key={s} className={`dr-stack-bar__seg dr-stack-bar__seg--${s}`} style={{ flex: count(s) }} />)}
          </div>
          <ul className="dr-legend">
            {overview.map((s) => (
              <li key={s}><i className={`dr-legend__dot dr-legend__dot--${s}`} /> {STATUS_LABELS[s]} <strong>{count(s)}</strong></li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="up-h">
          <div className="dr-panel-head">
            <h2 id="up-h">Upcoming appointments</h2>
            <Link to="/doctor/appointments" className="dr-link">View all <ArrowRight size={14} /></Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">No confirmed appointments ahead.</p>
          ) : (
            <ul className="dr-list">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <span className="avatar" aria-hidden="true">{a.patient.split(' ').map((p) => p[0]).join('')}</span>
                  <div><strong>{a.patient}</strong><small>{a.reason}</small></div>
                  <div className="dr-list__when"><span>{formatDate(a.date)}</span><small>{a.time}</small></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel dr-grid__wide" aria-labelledby="act-h">
          <div className="dr-panel-head"><h2 id="act-h">Recent patient activity</h2></div>
          <ul className="dr-activity">
            {activity.map((a) => (
              <li key={a.id}><span className="dr-activity__dot" aria-hidden="true" /><p>{a.text}</p><time>{a.time}</time></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
