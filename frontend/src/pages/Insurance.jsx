import { useState } from 'react';
import { Check, CircleMinus, Minus, Send } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SampleBadge from '../components/common/SampleBadge';
import { CLAIM_STEPS, INSURANCE_SUGGESTIONS, POLICIES } from '../data/sampleData';

const STATUS_ICON = { Covered: Check, Limited: Minus, 'Not covered': CircleMinus };

export default function Insurance() {
  const [policyId, setPolicyId] = useState(POLICIES[0].id);
  const [text, setText] = useState('');
  const [asked, setAsked] = useState(null);
  const policy = POLICIES.find((p) => p.id === policyId);

  const submit = (e) => {
    e.preventDefault();
    if (text.trim()) setAsked(text.trim());
  };

  return (
    <div className="page">
      <PageHeader
        title="Insurance"
        description="Understand what a policy covers and how claims work. Answers will come from the Insurance Agent once it is connected."
        badge={<SampleBadge>Sample policies</SampleBadge>}
      />

      <div className="split">
        <section className="panel" aria-labelledby="ask-h">
          <h2 id="ask-h" className="panel__title">Ask about insurance</h2>
          <form onSubmit={submit} className="stack">
            <textarea
              className="field field--area"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="For example: Is a day-care procedure covered under a family floater plan?"
              aria-label="Insurance question"
            />
            <div className="chip-row">
              {INSURANCE_SUGGESTIONS.map((s) => (
                <button type="button" key={s} className="chip chip--btn" onClick={() => setText(s)}>{s}</button>
              ))}
            </div>
            <button className="btn btn--primary" type="submit" disabled={!text.trim()}>
              <Send size={16} /> Ask
            </button>
          </form>

          {asked && (
            <div className="answer-preview" aria-live="polite">
              <div className="answer-preview__head">
                <strong>Preview of the answer area</strong>
                <SampleBadge>Not a real answer</SampleBadge>
              </div>
              <p className="muted">Your question: “{asked}”</p>
              <p>
                The Insurance Agent is not connected yet, so nothing was analysed. When it is, the
                answer, the policy clauses it relied on and any follow-up questions will appear here.
              </p>
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="claim-h">
          <h2 id="claim-h" className="panel__title">How a claim usually works</h2>
          <ol className="steps">
            {CLAIM_STEPS.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <small className="muted">General overview. Your insurer’s rules decide the details.</small>
        </section>
      </div>

      <section className="section" aria-labelledby="pol-h">
        <div className="section__head"><h2 id="pol-h">Example policies</h2><SampleBadge /></div>
        <div className="card-grid card-grid--3" role="radiogroup" aria-label="Policies">
          {POLICIES.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={p.id === policyId}
              className={`policy-card ${p.id === policyId ? 'is-active' : ''}`}
              onClick={() => setPolicyId(p.id)}
            >
              <span className="policy-card__kind">{p.kind}</span>
              <h3>{p.name}</h3>
              <p className="policy-card__sum">{p.sumInsured}<small> sum insured</small></p>
              <ul>
                {p.highlights.map((h) => <li key={h}><Check size={14} aria-hidden="true" /> {h}</li>)}
              </ul>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="cov-h">
        <h2 id="cov-h" className="panel__title">Coverage for {policy.name}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Benefit</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {policy.coverage.map((c) => {
                const Icon = STATUS_ICON[c.status];
                return (
                  <tr key={c.item}>
                    <td>{c.item}</td>
                    <td><span className={`cover cover--${c.status.replace(' ', '-').toLowerCase()}`}><Icon size={14} aria-hidden="true" /> {c.status}</span></td>
                    <td className="muted">{c.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
