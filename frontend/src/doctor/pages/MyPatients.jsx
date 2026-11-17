import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Mail,
  Phone,
  Plus,
  Search,
  SearchX,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useDoctor } from '../DoctorContext';
import { bookAppointment, formatDisplayTime, todayISO, toISO } from '../../services/appointmentService';

export default function MyPatients() {
  const { appointments, profile, showToast } = useDoctor();
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New patient modal state
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('32');
  const [patientGender, setPatientGender] = useState('Female');
  const [patientPhone, setPatientPhone] = useState('+91 98111 22334');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientReason, setPatientReason] = useState('Routine Outpatient Health Evaluation');
  const [appointmentDate, setAppointmentDate] = useState(() => todayISO());
  const [appointmentTime, setAppointmentTime] = useState('11:30 AM');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Combine patients from active appointments + patient registry + registered users
  const patientsList = useMemo(() => {
    const patientMap = new Map();

    // 1. Load registered patients
    try {
      const rawReg = localStorage.getItem('hn_patient_registry');
      if (rawReg) {
        const reg = JSON.parse(rawReg);
        if (Array.isArray(reg)) {
          reg.forEach((p) => {
            const key = (p.email || p.name).toLowerCase();
            patientMap.set(key, {
              id: p.id || `pt-${key}`,
              name: p.name,
              age: p.age || 28,
              gender: p.sex || 'Female',
              phone: p.phone || '+91 98765 43210',
              email: p.email || 'patient@healthnavigator.ai',
              totalVisits: 0,
              latestReason: 'Registered Patient',
              latestDate: p.registered_at ? p.registered_at.split('T')[0] : todayISO(),
              latestStatus: 'registered',
            });
          });
        }
      }
    } catch {}

    // 2. Also check general registered users
    try {
      const rawUsers = localStorage.getItem('hn_registered_users');
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        if (Array.isArray(users)) {
          users.forEach((u) => {
            if (u.role === 'patient') {
              const key = (u.email || u.name).toLowerCase();
              if (!patientMap.has(key)) {
                patientMap.set(key, {
                  id: u.id || `pt-${key}`,
                  name: u.name,
                  age: u.age || 28,
                  gender: u.sex || 'Female',
                  phone: u.phone || '+91 98765 43210',
                  email: u.email || '',
                  totalVisits: 0,
                  latestReason: 'Registered Patient',
                  latestDate: todayISO(),
                  latestStatus: 'registered',
                });
              }
            }
          });
        }
      }
    } catch {}

    // 3. Overlay and count from active doctor appointments
    appointments.forEach((a) => {
      const pName = a.patient || 'Patient';
      const key = (a.email || pName).toLowerCase();
      const existing = patientMap.get(key);

      if (existing) {
        existing.totalVisits += 1;
        existing.age = a.age || existing.age;
        existing.gender = a.gender || existing.gender;
        existing.phone = a.phone || existing.phone;
        if (a.date >= existing.latestDate) {
          existing.latestDate = a.date;
          existing.latestReason = a.reason || existing.latestReason;
          existing.latestStatus = a.status;
        }
      } else {
        patientMap.set(key, {
          id: a.id || `pt-${key}`,
          name: pName,
          age: a.age || 35,
          gender: a.gender || 'Not specified',
          phone: a.phone || '+91 98765 43210',
          email: a.email || `${pName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          totalVisits: 1,
          latestReason: a.reason || 'General Medical Consultation',
          latestDate: a.date,
          latestStatus: a.status,
        });
      }
    });

    return Array.from(patientMap.values()).sort((a, b) =>
      b.latestDate.localeCompare(a.latestDate) || a.name.localeCompare(b.name)
    );
  }, [appointments]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    if (!query.trim()) return patientsList;
    const q = query.toLowerCase().trim();
    return patientsList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.latestReason.toLowerCase().includes(q)
    );
  }, [patientsList, query]);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    setSubmitting(true);
    setSuccessMsg('');

    try {
      const generatedEmail =
        patientEmail.trim() ||
        `${patientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@patient.example`;

      await bookAppointment({
        doctor_id: profile.doctorId || 1,
        doctor_name: profile.name,
        doctor_type: profile.specialization,
        hospital_name: profile.hospital,
        city: profile.location || 'Delhi',
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        patient_name: patientName.trim(),
        patient_email: generatedEmail,
        patient_phone: patientPhone.trim(),
        patient_age: Number(patientAge) || 28,
        patient_sex: patientGender,
        reason: patientReason.trim(),
      });

      setSuccessMsg(`✓ ${patientName.trim()} registered and booked successfully!`);
      showToast?.(`Patient ${patientName.trim()} added to clinical queue.`);

      setTimeout(() => {
        setSuccessMsg('');
        setShowAddModal(false);
        setPatientName('');
      }, 1300);
    } catch (err) {
      console.error('Failed to register walk-in patient:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Patients Directory"
        description="Comprehensive clinical registry of all registered and outpatient patients receiving care."
        badge={
          <span
            className="role-badge role-badge--doctor"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Users size={12} /> {patientsList.length} Total Patients
          </span>
        }
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} /> Register Walk-In Patient
          </button>
        }
      />

      <div className="dr-toolbar">
        <label className="field field--icon dr-toolbar__search" style={{ maxWidth: '480px' }}>
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, phone, or reason..."
            aria-label="Search patients"
          />
          {query && (
            <button
              type="button"
              className="dr-eye"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </label>
        <span className="muted" style={{ fontSize: '0.875rem' }}>
          Showing <strong>{filteredPatients.length}</strong> of {patientsList.length} patients
        </span>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="empty">
          <SearchX size={30} aria-hidden="true" />
          <h3>No matching patients found</h3>
          <p>Try a different name or register a new walk-in patient above.</p>
        </div>
      ) : (
        <div className="dr-requests" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filteredPatients.map((p) => (
            <article key={p.id} className="dr-request" style={{ gap: '12px' }}>
              <header className="dr-request__head">
                <span className="avatar" aria-hidden="true">
                  {p.name
                    .split(' ')
                    .map((x) => x[0])
                    .join('')
                    .slice(0, 2)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{p.name}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {p.age} years · {p.gender}
                  </p>
                </div>
                {p.latestStatus && p.latestStatus !== 'registered' ? (
                  <StatusBadge status={p.latestStatus} />
                ) : (
                  <span
                    className="role-badge role-badge--patient"
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                  >
                    Registered
                  </span>
                )}
              </header>

              <ul className="dr-detail__list" style={{ fontSize: '0.875rem' }}>
                <li>
                  <Phone size={15} aria-hidden="true" /> {p.phone}
                </li>
                {p.email && (
                  <li>
                    <Mail size={15} aria-hidden="true" /> {p.email}
                  </li>
                )}
                <li>
                  <CalendarDays size={15} aria-hidden="true" /> Last visit: {p.latestDate}
                </li>
              </ul>

              <div className="dr-detail__block" style={{ padding: '10px 12px' }}>
                <h4 style={{ fontSize: '0.825rem', margin: '0 0 2px' }}>
                  <Stethoscope size={13} /> {p.latestReason}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ink-faint)' }}>
                  Total platform visits: <strong>{p.totalVisits}</strong>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Register Walk-in Patient Modal */}
      {showAddModal && (
        <div className="dr-overlay" role="dialog" aria-modal="true">
          <div className="dr-modal dr-modal--wide">
            <div className="dr-modal__head">
              <h2>Register &amp; Schedule Outpatient</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRegisterPatient}>
              <div className="dr-modal__body">
                {successMsg && (
                  <p
                    style={{
                      color: '#047857',
                      fontWeight: 600,
                      padding: '0.5rem 0.75rem',
                      background: '#ecfdf5',
                      borderRadius: 'var(--r-md)',
                      margin: 0,
                    }}
                  >
                    {successMsg}
                  </p>
                )}
                <div className="dr-form-grid">
                  <label className="stack">
                    <span className="label">Patient Full Name</span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Rohan Mehta"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Phone Number</span>
                    <input
                      className="field"
                      required
                      placeholder="+91 98111 22334"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Age</span>
                    <input
                      className="field"
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Gender</span>
                    <select
                      className="field"
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="stack dr-form-grid__wide">
                    <span className="label">Email Address (Optional)</span>
                    <input
                      className="field"
                      type="email"
                      placeholder="rohan@example.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                    />
                  </label>

                  <label className="stack dr-form-grid__wide">
                    <span className="label">Chief Medical Complaint / Reason</span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Chest tightness on brisk walking"
                      value={patientReason}
                      onChange={(e) => setPatientReason(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Appointment Date</span>
                    <input
                      className="field"
                      type="date"
                      required
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Appointment Time</span>
                    <select
                      className="field"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                    >
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="dr-modal__foot">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submitting}
                >
                  {submitting ? 'Registering...' : 'Register & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
