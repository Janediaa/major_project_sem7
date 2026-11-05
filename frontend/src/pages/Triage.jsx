import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Notice from '../components/common/Notice';
import SampleBadge from '../components/common/SampleBadge';

const SYMPTOMS = ['Fever', 'Cough', 'Sore throat', 'Headache', 'Nausea', 'Vomiting', 'Abdominal pain', 'Dizziness', 'Fatigue', 'Rash', 'Chest pain', 'Shortness of breath'];
const RED_FLAGS = ['Chest pain', 'Shortness of breath'];
const DURATIONS = ['Under a day', '1–3 days', '4–7 days', 'Over a week'];

const LEVELS = [
  { id: 'self', label: 'Self-care', text: 'Rest, fluids and watching how you feel may be reasonable. See a doctor if symptoms continue or get worse.' },
  { id: 'routine', label: 'Routine visit', text: 'Consider booking a non-urgent appointment in the next few days.' },
  { id: 'soon', label: 'See a doctor soon', text: 'Consider being seen within about a day.' },
  { id: 'urgent', label: 'Urgent care now', text: 'Seek emergency care now, or call 112.' },
];

// PREVIEW ONLY: picks which level to highlight from the slider and two red-flag symptoms.
// This is not a medical model. The Triage Agent replaces this when it is connected.
function previewLevel(severity, symptoms) {
  const bySeverity = severity <= 3 ? 0 : severity <= 6 ? 1 : severity <= 8 ? 2 : 3;
  const flagged = symptoms.some((s) => RED_FLAGS.includes(s));
  return Math.max(bySeverity, flagged ? 2 : 0);
}

export default function Triage() {
  const [symptoms, setSymptoms] = useState([]);
  const [details, setDetails] = useState('');
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [severity, setSeverity] = useState(4);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const toggle = (s) => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submit = (e) => {
    e.preventDefault();
    if (!symptoms.length && !details.trim()) {
      setError('Choose at least one symptom or describe what you feel.');
      return;
    }
    setError('');
    setResult({ level: previewLevel(severity, symptoms), symptoms, details: details.trim(), duration, severity });
  };

  const reset = () => { setSymptoms([]); setDetails(''); setSeverity(4); setDuration(DURATIONS[1]); setResult(null); setError(''); };
  const level = result ? LEVELS[result.level] : null;

  return (
    <div className="page">
      <PageHeader
        title="Triage"
        description="Describe how you feel to see how quickly you may want to seek care."
        badge={<SampleBadge>Layout preview</SampleBadge>}
      />

      <Notice tone="warning" title="This is not a diagnosis">
        It does not replace a qualified doctor. If you think this is an emergency, call 112 or go to the nearest emergency department now.
      </Notice>

      <div className="split split--triage">
        <form className="panel stack" onSubmit={submit} noValidate>
          <fieldset className="stack">
            <legend className="label">Which symptoms do you have?</legend>
            <div className="chip-row">
              {SYMPTOMS.map((s) => (
                <button type="button" key={s} className={`chip chip--btn ${symptoms.includes(s) ? 'is-active' : ''}`} onClick={() => toggle(s)} aria-pressed={symptoms.includes(s)}>
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="stack">
            <span className="label">Anything else you want to add?</span>
            <textarea className="field field--area" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="When it started, what makes it better or worse…" />
          </label>

          <fieldset className="stack">
            <legend className="label">How long has this lasted?</legend>
            <div className="segmented segmented--wrap">
              {DURATIONS.map((d) => (
                <button type="button" key={d} className={duration === d ? 'is-active' : ''} onClick={() => setDuration(d)} aria-pressed={duration === d}>{d}</button>
              ))}
            </div>
          </fieldset>

          <label className="stack">
            <span className="label">How severe is it? <strong className="severity-value">{severity} / 10</strong></span>
            <input type="range" min="1" max="10" value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="range" />
            <span className="range-ends"><small>Mild</small><small>Worst imaginable</small></span>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="row">
            <button className="btn btn--primary" type="submit">Get guidance</button>
            <button className="btn btn--ghost" type="button" onClick={reset}>Start over</button>
          </div>
        </form>

        <aside className="panel result" aria-live="polite">
          {!result ? (
            <div className="empty empty--inline">
              <h3>Your guidance appears here</h3>
              <p>Fill in the form and choose Get guidance.</p>
            </div>
          ) : (
            <>
              <div className="result__head">
                <h2 className="panel__title">Suggested urgency</h2>
                <SampleBadge>Preview, not an assessment</SampleBadge>
              </div>
              <div className="urgency" role="img" aria-label={`Urgency level: ${level.label}`}>
                {LEVELS.map((l, i) => (
                  <div key={l.id} className={`urgency__step urgency__step--${l.id} ${i === result.level ? 'is-current' : ''} ${i < result.level ? 'is-passed' : ''}`}>
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
              <h3 className={`result__level result__level--${level.id}`}>{level.label}</h3>
              <p>{level.text}</p>

              <dl className="summary">
                <div><dt>Symptoms</dt><dd>{result.symptoms.length ? result.symptoms.join(', ') : 'None selected'}</dd></div>
                <div><dt>Duration</dt><dd>{result.duration}</dd></div>
                <div><dt>Severity</dt><dd>{result.severity} / 10</dd></div>
                {result.details && <div><dt>Notes</dt><dd>{result.details}</dd></div>}
              </dl>

              <p className="muted result__note">
                The highlighted level is set from your severity and two warning-sign symptoms so you can see the design. No medical analysis took place.
              </p>

              <div className="row">
                <Link to="/doctor-hospital" className="btn btn--primary">Find a doctor <ArrowRight size={16} /></Link>
                <a href="tel:112" className="btn btn--ghost"><Phone size={16} /> Call 112</a>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
