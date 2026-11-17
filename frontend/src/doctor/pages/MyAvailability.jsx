import { useState } from 'react';
import { CalendarOff, Clock3, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useDoctor } from '../DoctorContext';
import { formatDate, todayISO } from '../data/mockDoctorData';

const DURATIONS = [15, 20, 30, 45, 60];
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export default function MyAvailability() {
  const { availability, setAvailability } = useDoctor();
  const [draft, setDraft] = useState(availability);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [dateError, setDateError] = useState('');

  const dirty = JSON.stringify(draft) !== JSON.stringify(availability);
  const setDay = (i, patch) => setDraft((d) => ({ ...d, days: d.days.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const invalid = (day) => day.working && toMin(day.end) <= toMin(day.start);
  const hasInvalid = draft.days.some(invalid);
  const slots = (day) => (day.working && !invalid(day) ? Math.floor((toMin(day.end) - toMin(day.start)) / draft.duration) : 0);
  const weeklySlots = draft.days.reduce((s, d) => s + slots(d), 0);

  const addDate = (e) => {
    e.preventDefault();
    if (!newDate) return setDateError('Choose a date.');
    if (draft.unavailableDates.some((u) => u.date === newDate)) return setDateError('That date is already marked unavailable.');
    setDateError('');
    setDraft((d) => ({
      ...d,
      unavailableDates: [...d.unavailableDates, { id: `u-${Date.now()}`, date: newDate, reason: newReason.trim() }].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setNewDate(''); setNewReason('');
  };

  const save = () => {
    if (hasInvalid) return;
    setAvailability(draft);
  };

  return (
    <div className="page">
      <PageHeader
        title="My Availability"
        description="Set the days and hours patients can book you, and block out dates you are away."
        badge={
          <span className="role-badge role-badge--doctor" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock3 size={12} /> Live Slot Manager
          </span>
        }
        actions={
          <div className="row">
            <button className="btn btn--ghost" onClick={() => setDraft(availability)} disabled={!dirty}><RotateCcw size={16} /> Discard</button>
            <button className="btn btn--primary" onClick={save} disabled={!dirty || hasInvalid}><Save size={16} /> Save changes</button>
          </div>
        }
      />

      <div className="dr-avail">
        <section className="panel stack" aria-labelledby="week-hours-h">
          <div className="dr-panel-head">
            <h2 id="week-hours-h">Weekly hours</h2>
            <span className="muted">{weeklySlots} bookable slots a week</span>
          </div>

          <fieldset className="stack">
            <legend className="label">Appointment duration</legend>
            <div className="segmented segmented--wrap">
              {DURATIONS.map((m) => (
                <button key={m} type="button" className={draft.duration === m ? 'is-active' : ''} aria-pressed={draft.duration === m} onClick={() => setDraft((d) => ({ ...d, duration: m }))}>
                  {m} min
                </button>
              ))}
            </div>
          </fieldset>

          <ul className="dr-days">
            {draft.days.map((day, i) => (
              <li key={day.name} className={`dr-day ${day.working ? '' : 'is-off'}`}>
                <label className="dr-switch">
                  <input type="checkbox" checked={day.working} onChange={(e) => setDay(i, { working: e.target.checked })} />
                  <span className="dr-switch__track" aria-hidden="true" />
                  <span className="dr-day__name">{day.name}</span>
                </label>

                {day.working ? (
                  <div className="dr-day__times">
                    <label>
                      <span className="sr-only">{day.name} start time</span>
                      <input className="field" type="time" value={day.start} onChange={(e) => setDay(i, { start: e.target.value })} aria-invalid={invalid(day)} />
                    </label>
                    <span className="muted">to</span>
                    <label>
                      <span className="sr-only">{day.name} end time</span>
                      <input className="field" type="time" value={day.end} onChange={(e) => setDay(i, { end: e.target.value })} aria-invalid={invalid(day)} />
                    </label>
                    <small className={invalid(day) ? 'form-error' : 'muted'} role={invalid(day) ? 'alert' : undefined}>
                      {invalid(day) ? 'End must be after start' : `${slots(day)} slots`}
                    </small>
                  </div>
                ) : (
                  <span className="muted dr-day__off">Unavailable</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel stack" aria-labelledby="off-h">
          <h2 id="off-h">Unavailable dates</h2>
          <p className="muted">Block out holidays, conferences or leave. Patients cannot book these dates.</p>

          <form className="stack" onSubmit={addDate} noValidate>
            <div className="two-col">
              <label className="stack">
                <span className="label">Date</span>
                <input className="field" type="date" min={todayISO()} value={newDate} onChange={(e) => { setNewDate(e.target.value); setDateError(''); }} />
              </label>
              <label className="stack">
                <span className="label">Reason <span className="muted">(optional)</span></span>
                <input className="field" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="e.g. Conference" />
              </label>
            </div>
            {dateError && <p className="form-error" role="alert">{dateError}</p>}
            <button className="btn btn--ghost" type="submit"><Plus size={16} /> Add unavailable date</button>
          </form>

          {draft.unavailableDates.length === 0 ? (
            <div className="empty empty--inline"><CalendarOff size={26} aria-hidden="true" /><h3>No blocked dates</h3><p>Dates you add will be listed here.</p></div>
          ) : (
            <ul className="dr-list dr-list--plain">
              {draft.unavailableDates.map((u) => (
                <li key={u.id}>
                  <div><strong>{formatDate(u.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</strong><small>{u.reason || 'No reason given'}</small></div>
                  <button className="icon-btn" aria-label={`Remove ${u.date}`} onClick={() => setDraft((d) => ({ ...d, unavailableDates: d.unavailableDates.filter((x) => x.id !== u.id) }))}>
                    <Trash2 size={17} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
