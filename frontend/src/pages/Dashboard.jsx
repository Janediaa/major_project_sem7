import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Activity, Stethoscope } from 'lucide-react';
import AgentMap from '../components/dashboard/AgentMap';
import StatusPill from '../components/common/StatusPill';
import SampleBadge from '../components/common/SampleBadge';
import { AGENT_MODULES, MODULES } from '../config/modules';
import { ACTIVITY, RAG_TOPICS } from '../data/sampleData';

export default function Dashboard() {
  return (
    <div className="page dashboard">
      <section className="hero">
        <div className="hero__copy">
          <h1>Find care, check symptoms and understand coverage in one place.</h1>
          <p>
            Healthcare Navigator brings specialised AI agents together so you do not have to jump
            between disconnected services. Today you can ask the Medical Knowledge Assistant; the
            other agents are being built.
          </p>
          <div className="hero__cta">
            <Link to="/medical-knowledge" className="btn btn--primary">
              <BookOpen size={18} /> Ask a medical question
            </Link>
            <Link to="/triage" className="btn btn--ghost">
              <Activity size={18} /> Check symptoms
            </Link>
            <Link to="/doctor-hospital" className="btn btn--ghost">
              <Stethoscope size={18} /> Find a doctor
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
          <h2>Medical Knowledge Assistant</h2>
          <p>
            Ask a health question and get an answer grounded in World Health Organization documents,
            with the sources listed underneath so you can read further.
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
          <div><dt>WHO documents</dt><dd>10</dd></div>
          <div><dt>Indexed passages</dt><dd>161</dd></div>
          <div>
            <dt>Live status</dt>
            <dd className="rag-panel__status">Not checked</dd>
          </div>
        </dl>
        <p className="rag-panel__note">
          Document counts come from the project notes. Live status needs the RAG API health check.
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
