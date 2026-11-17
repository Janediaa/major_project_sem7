import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Activity, Stethoscope, CalendarCheck2, Heart, PhoneCall, Shield } from 'lucide-react';
import AgentMap from '../components/dashboard/AgentMap';
import StatusPill from '../components/common/StatusPill';
import SampleBadge from '../components/common/SampleBadge';
import { AGENT_MODULES, MODULES } from '../config/modules';
import { ACTIVITY, RAG_TOPICS } from '../data/sampleData';
import { getAppointmentStats, getHealthStatus } from '../services/appointmentService';
import { ROLES, useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);

  if (role === ROLES.DOCTOR) {
    return <Navigate to="/doctor" replace />;
  }

  useEffect(() => {
    let active = true;
    Promise.allSettled([getAppointmentStats(), getHealthStatus()]).then(
      ([statsRes, healthRes]) => {
        if (!active) return;
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page dashboard">
      {/* Patient Portal Welcome Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--r-md)',
          background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdfa 100%)',
          border: '1px solid #c7d2fe',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Heart size={20} style={{ color: 'var(--teal-600)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--navy-900)' }}>
            Welcome back, <strong>{user?.name || 'Alex Sharma'}</strong> · Signed in as{' '}
            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{role || 'Patient'}</span>
            {' '}— Your personal healthcare, appointments, and medical knowledge dashboard
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="role-badge role-badge--patient">
            Patient Portal
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: '#dc2626',
              background: '#fef2f2',
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              border: '1px solid #fecaca',
              fontWeight: 500,
            }}
          >
            <PhoneCall size={12} /> Emergency: 102 / 108
          </span>
        </div>
      </div>

      <section className="hero">
        <div className="hero__copy">
          <h1>Find care, book appointments and understand medical guidance in one place.</h1>
          <p>
            Healthcare Navigator brings specialised AI agents together so you do not have to jump
            between disconnected services. Doctor &amp; Hospital search, Appointments, and the
            Medical Knowledge Assistant are live; Triage and Insurance are next.
          </p>
          <div className="hero__cta">
            <Link to="/appointments" className="btn btn--primary">
              <CalendarCheck2 size={18} /> Book an appointment
            </Link>
            <Link to="/doctor-hospital" className="btn btn--ghost">
              <Stethoscope size={18} /> Find a doctor
            </Link>
            <Link to="/medical-knowledge" className="btn btn--ghost">
              <BookOpen size={18} /> Ask a medical question
            </Link>
            <Link to="/triage" className="btn btn--ghost">
              <Activity size={18} /> Check symptoms
            </Link>
          </div>
        </div>
        <AgentMap />
      </section>

      <section aria-labelledby="modules-h" className="section">
        <div className="module-grid">
          {AGENT_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.id} to={m.path} className={`module-card ${m.status === 'ready' ? 'module-card--ready' : ''}`}>
                <span className="module-card__icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{m.label}</h3>
                <p>{m.summary}</p>
                <div className="module-card__foot">
                  <StatusPill status={m.status} />
                  <span className="module-card__open">Open <ArrowRight size={15} aria-hidden="true" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rag-panel">
        <div className="rag-panel__main">
          <h2>Platform &amp; Knowledge Overview</h2>
          <p>
            Ask health questions grounded in World Health Organization documents, search verified
            doctors across Indian cities, and book OPD slots backed by the merged Medscheduler dataset.
          </p>
          <div className="chip-row">
            {RAG_TOPICS.map((t) => (
              <span key={t} className="chip chip--dark">{t}</span>
            ))}
          </div>
          <Link to="/medical-knowledge" className="btn btn--light">
            Start asking <ArrowRight size={17} />
          </Link>
        </div>
        <dl className="rag-panel__stats">
          <div><dt>Doctors indexed</dt><dd>{stats ? stats.doctors : 484}</dd></div>
          <div><dt>OPD schedules</dt><dd>{stats ? stats.schedule_rows : 2224}</dd></div>
          <div>
            <dt>RAG status</dt>
            <dd className="rag-panel__status">
              {health ? (health.rag_initialized ? `Live (${health.total_chunks} chunks)` : 'Degraded') : 'Offline'}
            </dd>
          </div>
        </dl>
        <p className="rag-panel__note">
          Merged dataset: {stats ? stats.merged_historical_records : 2904} historical outpatient records ·{' '}
          {stats ? stats.upcoming_bookings : 0} active patient bookings.
        </p>
      </section>

      <section className="section" aria-labelledby="activity-h">
        <div className="section__head">
          <h2 id="activity-h">Recent activity</h2>
          <SampleBadge />
        </div>
        <ul className="activity">
          {ACTIVITY.map((a) => {
            const m = MODULES.find((x) => x.id === a.module);
            const Icon = m.icon;
            return (
              <li key={a.id}>
                <span className="activity__icon"><Icon size={17} aria-hidden="true" /></span>
                <div>
                  <p>{a.text}</p>
                  <small>{m.label}</small>
                </div>
                <time>{a.time}</time>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
