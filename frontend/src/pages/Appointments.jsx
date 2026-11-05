import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarCheck2, CalendarX2, Check, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Notice from '../components/common/Notice';
import SampleBadge from '../components/common/SampleBadge';
import { APPOINTMENT_HISTORY, DOCTORS, HOSPITALS, TIME_SLOTS } from '../data/sampleData';

function nextDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      key: d.toDateString(),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      long: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  });
}

// Sample rule so some slots look taken. Real availability comes from the Appointment Agent.
const isTaken = (dayIndex, slotIndex) => (dayIndex * 3 + slotIndex * 7) % 4 === 0;

export default function Appointments() {
  const { state } = useLocation();
  const days = useMemo(() => nextDays(7), []);

  const presetDoctor = DOCTORS.find((d) => d.id === state?.doctorId);
  const [hospitalId, setHospitalId] = useState(presetDoctor?.hospitalId ?? state?.hospitalId ?? '');
  const [doctorId, setDoctorId] = useState(presetDoctor?.id ?? '');
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [list, setList] = useState(APPOINTMENT_HISTORY);
  const [tab, setTab] = useState('upcoming');
  const [toast, setToast] = useState('');

  const doctor = DOCTORS.find((d) => d.id === doctorId);
  const hospital = HOSPITALS.find((h) => h.id === hospitalId);
  const doctorOptions = DOCTORS.filter((d) => !hospitalId || d.hospitalId === hospitalId);
  const ready = doctor && hospital && slot;

  const pickHospital = (id) => {
    setHospitalId(id);
    if (doctor && id && doctor.hospitalId !== id) setDoctorId('');
  };
  const pickDoctor = (id) => {
    setDoctorId(id);
    const d = DOCTORS.find((x) => x.id === id);
    if (d) setHospitalId(d.hospitalId);
  };

  const confirm = () => {
    if (!ready) return;
    setList((cur) => [
      { id: `new-${Date.now()}`, doctor: doctor.name, hospital: hospital.name, when: days[dayIndex].long, time: slot, status: 'upcoming', demo: true },
      ...cur,
    ]);
    setToast(`Demo booking added for ${days[dayIndex].long}, ${slot}. Nothing was sent or saved.`);
    setSlot(''); setReason(''); setTab('upcoming');
  };

  const cancel = (id) => setList((cur) => cur.filter((a) => a.id !== id));
  const shown = list.filter((a) => a.status === tab);

  return (
    <div className="page">
      <PageHeader
        title="Appointments"
        description="Choose a doctor, a day and a time. Booking will be handled by the Appointment Agent once it is connected."
        badge={<SampleBadge>Demo booking</SampleBadge>}
      />

      <div className="split split--book">
        <section className="panel stack" aria-labelledby="book-h">
          <h2 id="book-h" className="panel__title">Book a visit</h2>

          <div className="two-col">
            <label className="stack">
              <span className="label">Hospital</span>
              <select className="field" value={hospitalId} onChange={(e) => pickHospital(e.target.value)}>
                <option value="">Any hospital</option>
                {HOSPITALS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="stack">
              <span className="label">Doctor</span>
              <select className="field" value={doctorId} onChange={(e) => pickDoctor(e.target.value)}>
                <option value="">Select a doctor</option>
                {doctorOptions.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>)}
              </select>
            </label>
          </div>

          <fieldset className="stack">
            <legend className="label">Date</legend>
            <div className="date-strip">
              {days.map((d, i) => (
                <button key={d.key} type="button" className={`date-chip ${i === dayIndex ? 'is-active' : ''}`} onClick={() => { setDayIndex(i); setSlot(''); }} aria-pressed={i === dayIndex}>
                  <small>{d.weekday}</small><strong>{d.day}</strong><small>{d.month}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="stack">
            <legend className="label">Time <span className="muted">· sample availability</span></legend>
            <div className="slot-grid">
              {TIME_SLOTS.map((t, i) => {
                const taken = isTaken(dayIndex, i);
                return (
                  <button key={t} type="button" disabled={taken} className={`slot ${slot === t ? 'is-active' : ''}`} onClick={() => setSlot(t)} aria-pressed={slot === t}>
                    {t}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="stack">
            <span className="label">Reason for visit <span className="muted">(optional)</span></span>
            <textarea className="field field--area" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe why you want to see the doctor" />
          </label>
        </section>

        <aside className="panel summary-card" aria-labelledby="sum-h">
          <h2 id="sum-h" className="panel__title">Summary</h2>
          <dl className="summary">
            <div><dt>Doctor</dt><dd>{doctor ? `${doctor.name} (${doctor.specialty})` : 'Not selected'}</dd></div>
            <div><dt>Hospital</dt><dd>{hospital ? hospital.name : 'Not selected'}</dd></div>
            <div><dt>Date</dt><dd>{days[dayIndex].long}</dd></div>
            <div><dt>Time</dt><dd>{slot || 'Not selected'}</dd></div>
            {reason.trim() && <div><dt>Reason</dt><dd>{reason.trim()}</dd></div>}
          </dl>
          <button className="btn btn--primary btn--block" disabled={!ready} onClick={confirm}>
            <CalendarCheck2 size={17} /> Confirm appointment
          </button>
          <small className="muted">Prototype: confirming only adds an entry to the list below.</small>
        </aside>
      </div>

      {toast && (
        <Notice tone="info" title="Added">
          {toast}
          <button className="notice__close" onClick={() => setToast('')} aria-label="Dismiss"><X size={16} /></button>
        </Notice>
      )}

      <section className="section" aria-labelledby="hist-h">
        <div className="section__head">
          <h2 id="hist-h">Your appointments</h2>
          <div className="segmented" role="tablist">
            {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="empty empty--inline">
            <CalendarX2 size={28} aria-hidden="true" />
            <h3>No {tab} appointments</h3>
            <p>Book a visit above and it will show up here.</p>
          </div>
        ) : (
          <ul className="history">
            {shown.map((a) => (
              <li key={a.id}>
                <span className="activity__icon"><Check size={16} aria-hidden="true" /></span>
                <div>
                  <p><strong>{a.doctor}</strong></p>
                  <small>{a.hospital}</small>
                </div>
                <div className="history__when">
                  <span>{a.when}</span>
                  <small>{a.time}</small>
                </div>
                {a.demo ? <SampleBadge>Demo</SampleBadge> : <SampleBadge>Sample</SampleBadge>}
                {tab === 'upcoming' && <button className="btn btn--ghost btn--sm" onClick={() => cancel(a.id)}>Cancel</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
