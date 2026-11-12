import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  Check,
  Clock,
  IndianRupee,
  RefreshCw,
  Stethoscope,
  X,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Notice from '../components/common/Notice';
import { getDoctors, getHospitals } from '../services/healthcareService';
import {
  bookAppointment,
  cancelAppointment,
  getAppointments,
  getDoctorAvailability,
  getDoctorSchedule,
  getDoctorSlots,
  rescheduleAppointment,
} from '../services/appointmentService';

const formatTitle = (value = '') =>
  String(value)
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function Appointments() {
  const { state } = useLocation();

  const [doctorsData, setDoctorsData] = useState([]);
  const [hospitalsData, setHospitalsData] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError, setInitError] = useState('');

  const [city, setCity] = useState(state?.city ? String(state.city).toLowerCase() : '');
  const [hospitalId, setHospitalId] = useState(
    state?.hospitalId ? String(state.hospitalId) : ''
  );
  const [doctorId, setDoctorId] = useState(
    state?.doctorId ? String(state.doctorId) : ''
  );

  const [availability, setAvailability] = useState([]);
  const [scheduleInfo, setScheduleInfo] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slotsData, setSlotsData] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [slot, setSlot] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');

  const [tab, setTab] = useState('upcoming');
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [appointmentsTotal, setAppointmentsTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  // Inline reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDays, setRescheduleDays] = useState([]);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  // Load real doctors & hospitals from backend
  useEffect(() => {
    let active = true;
    async function loadDirectory() {
      try {
        setLoadingInit(true);
        setInitError('');
        const [docRes, hospRes] = await Promise.all([
          getDoctors(),
          getHospitals(),
        ]);
        if (!active) return;

        const docs = docRes.doctors || [];
        const hosps = hospRes.hospitals || [];
        setDoctorsData(docs);
        setHospitalsData(hosps);

        // Preselect from navigation state or pick first doctor cleanly
        if (state?.doctorId) {
          const matched = docs.find((d) => String(d.doctor_id) === String(state.doctorId));
          if (matched) {
            setDoctorId(String(matched.doctor_id));
            if (matched.hospital_id) setHospitalId(String(matched.hospital_id));
            if (matched.city) setCity(String(matched.city).toLowerCase());
          }
        } else if (state?.hospitalId) {
          const firstDoc = docs.find((d) => String(d.hospital_id) === String(state.hospitalId));
          if (firstDoc) {
            setDoctorId(String(firstDoc.doctor_id));
            if (firstDoc.city) setCity(String(firstDoc.city).toLowerCase());
          }
        } else if (docs.length > 0) {
          setDoctorId(String(docs[0].doctor_id));
          if (docs[0].hospital_id) setHospitalId(String(docs[0].hospital_id));
          if (docs[0].city) setCity(String(docs[0].city).toLowerCase());
        }
      } catch (err) {
        if (active) setInitError(err.message || 'Unable to connect to appointment server.');
      } finally {
        if (active) setLoadingInit(false);
      }
    }
    loadDirectory();
    return () => {
      active = false;
    };
  }, [state]);

  const cities = useMemo(() => {
    const unique = [...new Set(doctorsData.map((d) => String(d.city || '').toLowerCase()).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [doctorsData]);

  const filteredHospitals = useMemo(() => {
    return hospitalsData.filter(
      (h) => !city || String(h.city || '').toLowerCase() === city
    );
  }, [hospitalsData, city]);

  const filteredDoctors = useMemo(() => {
    return doctorsData.filter((d) => {
      const matchCity = !city || String(d.city || '').toLowerCase() === city;
      const matchHosp = !hospitalId || String(d.hospital_id) === hospitalId;
      return matchCity && matchHosp;
    });
  }, [doctorsData, city, hospitalId]);

  const selectedDoctor = useMemo(
    () => doctorsData.find((d) => String(d.doctor_id) === doctorId) || null,
    [doctorsData, doctorId]
  );

  // Load doctor weekly schedule & 7-day availability when doctor changes
  const refreshDoctorAvailability = useCallback(async (docId, keepDate = false) => {
    if (!docId) {
      setAvailability([]);
      setScheduleInfo([]);
      setSelectedDate('');
      setSlotsData(null);
      return;
    }
    try {
      const [availRes, schedRes] = await Promise.all([
        getDoctorAvailability(docId, { days: 7 }),
        getDoctorSchedule(docId),
      ]);
      const days = availRes.days || [];
      setAvailability(days);
      setScheduleInfo(schedRes.schedules || []);

      if (!keepDate) {
        const firstOpen = days.find((d) => d.opd_open && d.available_count > 0) || days[0];
        setSelectedDate(firstOpen ? firstOpen.date : '');
        setSlot('');
      }
    } catch (err) {
      setFormError(err.message || 'Could not load doctor schedule.');
    }
  }, []);

  useEffect(() => {
    if (doctorId) {
      refreshDoctorAvailability(doctorId, false);
    } else {
      setAvailability([]);
      setScheduleInfo([]);
      setSelectedDate('');
      setSlotsData(null);
    }
  }, [doctorId, refreshDoctorAvailability]);

  // Load slot breakdown when selectedDate or doctorId changes
  const refreshSlots = useCallback(async (docId, dateStr) => {
    if (!docId || !dateStr) {
      setSlotsData(null);
      return;
    }
    try {
      setLoadingSlots(true);
      const res = await getDoctorSlots(docId, dateStr);
      setSlotsData(res);
    } catch (err) {
      setFormError(err.message || 'Unable to load time slots.');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (doctorId && selectedDate) {
      refreshSlots(doctorId, selectedDate);
    }
  }, [doctorId, selectedDate, refreshSlots]);

  // Load appointments list for active tab
  const refreshAppointmentsList = useCallback(async () => {
    try {
      setLoadingList(true);
      const filters =
        tab === 'upcoming'
          ? { status: 'upcoming', limit: 50 }
          : tab === 'past'
          ? { status: 'past', source: 'user_booking', limit: 50 }
          : { source: 'medscheduler_merged', limit: 30 };

      const res = await getAppointments(filters);
      setAppointmentsList(res.appointments || []);
      setAppointmentsTotal(res.total || 0);
    } catch {
      setAppointmentsList([]);
    } finally {
      setLoadingList(false);
    }
  }, [tab]);

  useEffect(() => {
    refreshAppointmentsList();
  }, [refreshAppointmentsList]);

  const handleCityChange = (nextCity) => {
    setCity(nextCity);
    setHospitalId('');
    const nextDocs = doctorsData.filter(
      (d) => !nextCity || String(d.city || '').toLowerCase() === nextCity
    );
    setDoctorId(nextDocs.length > 0 ? String(nextDocs[0].doctor_id) : '');
    setSlot('');
  };

  const handleHospitalChange = (nextHospId) => {
    setHospitalId(nextHospId);
    const nextDocs = doctorsData.filter((d) => {
      const matchCity = !city || String(d.city || '').toLowerCase() === city;
      const matchHosp = !nextHospId || String(d.hospital_id) === nextHospId;
      return matchCity && matchHosp;
    });
    if (!nextDocs.some((d) => String(d.doctor_id) === doctorId)) {
      setDoctorId(nextDocs.length > 0 ? String(nextDocs[0].doctor_id) : '');
    }
    setSlot('');
  };

  const handleDoctorChange = (nextDocId) => {
    setDoctorId(nextDocId);
    const d = doctorsData.find((x) => String(x.doctor_id) === nextDocId);
    if (d?.hospital_id) setHospitalId(String(d.hospital_id));
    if (d?.city) setCity(String(d.city).toLowerCase());
    setSlot('');
  };

  const selectedDayMeta = availability.find((d) => d.date === selectedDate) || null;
  const ready = Boolean(selectedDoctor && selectedDate && slot && patientName.trim() && !submitting);

  const handleConfirm = async () => {
    if (!ready) return;
    setFormError('');
    setSubmitting(true);
    try {
      const parsedAge = patientAge.trim() ? Number(patientAge.trim()) : null;
      const res = await bookAppointment({
        doctor_id: Number(doctorId),
        appointment_date: selectedDate,
        appointment_time: slot,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim() || null,
        patient_age: parsedAge,
        patient_sex: patientSex || null,
        reason: reason.trim() || null,
      });

      const booked = res.appointment;
      setToast(
        `Confirmed (${booked.booking_reference}): ${booked.doctor_name} on ${booked.appointment_date} at ${booked.display_time}.`
      );
      setSlot('');
      setReason('');
      setTab('upcoming');
      await Promise.all([
        refreshSlots(doctorId, selectedDate),
        refreshDoctorAvailability(doctorId, true),
        refreshAppointmentsList(),
      ]);
    } catch (err) {
      setFormError(err.message || 'Failed to confirm appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      await cancelAppointment(appointmentId);
      setToast('Appointment cancelled and slot released.');
      await Promise.all([
        refreshAppointmentsList(),
        doctorId && selectedDate ? refreshSlots(doctorId, selectedDate) : Promise.resolve(),
        doctorId ? refreshDoctorAvailability(doctorId, true) : Promise.resolve(),
      ]);
    } catch (err) {
      setFormError(err.message || 'Could not cancel appointment.');
    }
  };

  const startReschedule = async (appt) => {
    setRescheduleTarget(appt.appointment_id);
    setRescheduleTime('');
    setRescheduleSlots([]);
    try {
      const avail = await getDoctorAvailability(appt.doctor_id, { days: 7 });
      const openDays = (avail.days || []).filter((d) => d.opd_open && d.available_count > 0);
      setRescheduleDays(openDays);
      if (openDays.length > 0) {
        setRescheduleDate(openDays[0].date);
        const slotRes = await getDoctorSlots(appt.doctor_id, openDays[0].date);
        setRescheduleSlots((slotRes.slots || []).filter((s) => s.available));
      }
    } catch (err) {
      setFormError(err.message || 'Unable to load reschedule options.');
    }
  };

  const changeRescheduleDate = async (docId, dateStr) => {
    setRescheduleDate(dateStr);
    setRescheduleTime('');
    try {
      const slotRes = await getDoctorSlots(docId, dateStr);
      setRescheduleSlots((slotRes.slots || []).filter((s) => s.available));
    } catch {
      setRescheduleSlots([]);
    }
  };

  const confirmReschedule = async (appointmentId) => {
    if (!rescheduleDate || !rescheduleTime) return;
    setRescheduleBusy(true);
    try {
      const res = await rescheduleAppointment(appointmentId, {
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime,
      });
      setToast(
        `Rescheduled (${res.appointment.booking_reference}) to ${res.appointment.appointment_date} at ${res.appointment.display_time}.`
      );
      setRescheduleTarget(null);
      await Promise.all([
        refreshAppointmentsList(),
        doctorId && selectedDate ? refreshSlots(doctorId, selectedDate) : Promise.resolve(),
        doctorId ? refreshDoctorAvailability(doctorId, true) : Promise.resolve(),
      ]);
    } catch (err) {
      setFormError(err.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleBusy(false);
    }
  };

  const opdDaysLabel = scheduleInfo.map((s) => s.day_name.slice(0, 3)).join(', ');
  const avgWait = scheduleInfo[0]?.avg_waiting_minutes;
  const opdWindow = scheduleInfo[0]
    ? `${scheduleInfo[0].start_time} – ${scheduleInfo[0].end_time} (${scheduleInfo[0].slot_duration_minutes} min slots)`
    : null;

  return (
    <div className="page">
      <PageHeader
        title="Appointments"
        description="Book real OPD slots merged from the Medscheduler outpatient calendar with our verified Indian doctors database."
      />

      {initError && (
        <Notice tone="warning" title="Backend connection issue">
          {initError}
        </Notice>
      )}

      {toast && (
        <Notice tone="info" title="Appointment update">
          {toast}
          <button className="notice__close" onClick={() => setToast('')} aria-label="Dismiss">
            <X size={16} />
          </button>
        </Notice>
      )}

      {formError && (
        <Notice tone="warning" title="Please check">
          {formError}
          <button className="notice__close" onClick={() => setFormError('')} aria-label="Dismiss">
            <X size={16} />
          </button>
        </Notice>
      )}

      <div className="split split--book">
        <section className="panel stack" aria-labelledby="book-h">
          <h2 id="book-h" className="panel__title">Book a visit</h2>

          <div className="two-col">
            <label className="stack">
              <span className="label">City</span>
              <select
                className="field"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={loadingInit}
              >
                <option value="">All cities ({cities.length})</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {formatTitle(c)}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack">
              <span className="label">Hospital</span>
              <select
                className="field"
                value={hospitalId}
                onChange={(e) => handleHospitalChange(e.target.value)}
                disabled={loadingInit}
              >
                <option value="">All hospitals ({filteredHospitals.length})</option>
                {filteredHospitals.map((h) => (
                  <option key={h.hospital_id} value={String(h.hospital_id)}>
                    {formatTitle(h.hospital_name)} ({formatTitle(h.city)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="stack">
            <span className="label">Doctor ({filteredDoctors.length} available)</span>
            <select
              className="field"
              value={doctorId}
              onChange={(e) => handleDoctorChange(e.target.value)}
              disabled={loadingInit || filteredDoctors.length === 0}
            >
              <option value="">Select a doctor</option>
              {filteredDoctors.map((d) => (
                <option key={d.doctor_id} value={String(d.doctor_id)}>
                  {formatTitle(d.doctor_name)} · {formatTitle(d.doctor_type || 'Specialist')} ({formatTitle(d.city)})
                </option>
              ))}
            </select>
          </label>

          {selectedDoctor && (
            <div className="opd-banner">
              <span>
                <Stethoscope size={15} aria-hidden="true" />
                <strong>OPD:</strong> {opdDaysLabel || 'Mon–Fri'} · {opdWindow || 'Standard hours'}
              </span>
              <span>
                <Clock size={15} aria-hidden="true" />
                <strong>Avg wait:</strong> {avgWait != null ? `${avgWait} min` : '12 min'}
              </span>
              <span>
                <IndianRupee size={15} aria-hidden="true" />
                <strong>Fee:</strong> {selectedDoctor.fees != null ? `₹${selectedDoctor.fees}` : 'On request'}
              </span>
            </div>
          )}

          <fieldset className="stack">
            <legend className="label">Date</legend>
            <div className="date-strip">
              {availability.map((d) => {
                const closed = !d.opd_open || d.available_count === 0;
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={closed}
                    className={`date-chip ${d.date === selectedDate ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setSlot('');
                    }}
                    aria-pressed={d.date === selectedDate}
                  >
                    <small>{d.weekday_short}</small>
                    <strong>{d.day_num}</strong>
                    <small>{d.opd_open ? `${d.available_count} free` : 'Closed'}</small>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="stack">
            <legend className="label">
              Time{' '}
              <span className="muted">
                · {slotsData ? `${slotsData.available_count} of ${slotsData.total_count} slots open` : 'Select a date'}
              </span>
            </legend>
            {loadingSlots ? (
              <p className="muted">Loading slots…</p>
            ) : !slotsData || !slotsData.opd_open ? (
              <p className="muted">OPD is closed on this day. Please pick an open weekday.</p>
            ) : (
              <div className="slot-grid">
                {slotsData.slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    title={
                      s.available
                        ? `Book ${s.display_time}`
                        : s.status === 'booked'
                        ? 'Already booked'
                        : s.status === 'reserved'
                        ? 'Reserved in clinic schedule (Medscheduler)'
                        : 'Time passed'
                    }
                    className={`slot ${slot === s.time ? 'is-active' : ''}`}
                    onClick={() => setSlot(s.time)}
                    aria-pressed={slot === s.time}
                  >
                    {s.display_time}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <div className="two-col">
            <label className="stack">
              <span className="label">Patient name *</span>
              <input
                className="field"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Full name of patient"
              />
            </label>
            <label className="stack">
              <span className="label">Phone <span className="muted">(optional)</span></span>
              <input
                className="field"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </label>
          </div>

          <div className="two-col">
            <label className="stack">
              <span className="label">Age <span className="muted">(optional)</span></span>
              <input
                className="field"
                type="number"
                min="0"
                max="120"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="Years"
              />
            </label>
            <label className="stack">
              <span className="label">Gender <span className="muted">(optional)</span></span>
              <select
                className="field"
                value={patientSex}
                onChange={(e) => setPatientSex(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>

          <label className="stack">
            <span className="label">Reason for visit <span className="muted">(optional)</span></span>
            <textarea
              className="field field--area"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe symptoms or consultation purpose"
            />
          </label>
        </section>

        <aside className="panel summary-card" aria-labelledby="sum-h">
          <h2 id="sum-h" className="panel__title">Booking summary</h2>
          <dl className="summary">
            <div>
              <dt>Doctor</dt>
              <dd>
                {selectedDoctor
                  ? `${formatTitle(selectedDoctor.doctor_name)} (${formatTitle(selectedDoctor.doctor_type || 'Specialist')})`
                  : 'Not selected'}
              </dd>
            </div>
            <div>
              <dt>Hospital</dt>
              <dd>
                {selectedDoctor?.hospital_name
                  ? `${formatTitle(selectedDoctor.hospital_name)}, ${formatTitle(selectedDoctor.city)}`
                  : 'Not selected'}
              </dd>
            </div>
            <div>
              <dt>Fee</dt>
              <dd>{selectedDoctor?.fees != null ? `₹${selectedDoctor.fees}` : '—'}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{selectedDayMeta ? selectedDayMeta.long_label : selectedDate || 'Not selected'}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {slot
                  ? slotsData?.slots.find((s) => s.time === slot)?.display_time || slot
                  : 'Not selected'}
              </dd>
            </div>
            <div>
              <dt>Patient</dt>
              <dd>{patientName.trim() || 'Enter patient name'}</dd>
            </div>
            {reason.trim() && (
              <div>
                <dt>Reason</dt>
                <dd>{reason.trim()}</dd>
              </div>
            )}
          </dl>

          <button className="btn btn--primary btn--block" disabled={!ready} onClick={handleConfirm}>
            <CalendarCheck2 size={17} />
            {submitting ? 'Confirming…' : 'Confirm appointment'}
          </button>
          <small className="muted">
            Persisted to SQLite with double-booking prevention and real slot release on cancellation.
          </small>
        </aside>
      </div>

      <section className="section" aria-labelledby="hist-h">
        <div className="section__head">
          <h2 id="hist-h">
            Appointments <span className="count">{appointmentsTotal}</span>
          </h2>
          <div className="segmented" role="tablist">
            {[
              ['upcoming', 'Upcoming'],
              ['past', 'Past / Cancelled'],
              ['merged', 'Merged Clinic History'],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'is-active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadingList ? (
          <p className="muted">Loading appointments…</p>
        ) : appointmentsList.length === 0 ? (
          <div className="empty empty--inline">
            <CalendarX2 size={28} aria-hidden="true" />
            <h3>No {tab === 'upcoming' ? 'upcoming' : tab === 'past' ? 'past' : 'merged'} appointments</h3>
            <p>
              {tab === 'upcoming'
                ? 'Book a slot above and it will appear here immediately.'
                : 'No records match this filter yet.'}
            </p>
          </div>
        ) : (
          <ul className="history">
            {appointmentsList.map((a) => (
              <li key={a.appointment_id} className="history-item">
                <div className="history-item__main">
                  <span className="activity__icon">
                    <Check size={16} aria-hidden="true" />
                  </span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p>
                      <strong>{formatTitle(a.doctor_name)}</strong>{' '}
                      <span className="muted">· {formatTitle(a.doctor_type || '')}</span>
                    </p>
                    <small>
                      {a.hospital_name ? `${formatTitle(a.hospital_name)}, ` : ''}
                      {formatTitle(a.city)} · Patient: <strong>{a.patient_name}</strong> · Ref:{' '}
                      <code>{a.booking_reference}</code>
                    </small>
                  </div>
                  <div className="history__when">
                    <span>{a.appointment_date}</span>
                    <small>{a.display_time || a.appointment_time}</small>
                  </div>
                  <span className={`appt-badge appt-badge--${a.status.replace(/\s+/g, '-')}`}>
                    {a.status}
                  </span>
                  {tab === 'upcoming' && a.status === 'scheduled' && (
                    <div className="row">
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() =>
                          rescheduleTarget === a.appointment_id
                            ? setRescheduleTarget(null)
                            : startReschedule(a)
                        }
                      >
                        <CalendarClock size={14} /> Reschedule
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleCancel(a.appointment_id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {rescheduleTarget === a.appointment_id && (
                  <div className="reschedule-box">
                    <div className="two-col">
                      <label className="stack">
                        <span className="label">New date</span>
                        <select
                          className="field"
                          value={rescheduleDate}
                          onChange={(e) => changeRescheduleDate(a.doctor_id, e.target.value)}
                        >
                          {rescheduleDays.map((d) => (
                            <option key={d.date} value={d.date}>
                              {d.long_label} ({d.available_count} free)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="stack">
                        <span className="label">New time slot</span>
                        <select
                          className="field"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                        >
                          <option value="">Select time</option>
                          {rescheduleSlots.map((s) => (
                            <option key={s.time} value={s.time}>
                              {s.display_time}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="row">
                      <button
                        className="btn btn--primary btn--sm"
                        disabled={!rescheduleDate || !rescheduleTime || rescheduleBusy}
                        onClick={() => confirmReschedule(a.appointment_id)}
                      >
                        <RefreshCw size={14} /> {rescheduleBusy ? 'Saving…' : 'Save new slot'}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setRescheduleTarget(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
