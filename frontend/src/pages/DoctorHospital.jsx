
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarPlus,
  Clock,
  History,
  IndianRupee,
  MapPin,
  Search,
  SearchX,
  UserPlus,
  UserRound,
  BriefcaseMedical,
  X,
} from 'lucide-react';

import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import { getDoctors, getHospitals, saveCustomDoctor } from '../services/healthcareService';
import {
  clearAllSearchHistory,
  loadSearchHistory,
  removeSearchItem,
  saveSearchItem,
} from '../utils/searchHistory';

const initials = (name = '') =>
  name
    .replace(/^Dr\.?\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

const has = (text, q) =>
  String(text || '').toLowerCase().includes(q.toLowerCase());

export default function DoctorHospital() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [tab, setTab] = useState('all');
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    setRecentHistory(loadSearchHistory(user?.id));
  }, [user?.id]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      const updated = saveSearchItem(user?.id, query.trim(), '/doctor-hospital');
      if (updated) setRecentHistory(updated);
    }
  };

  const [doctorsData, setDoctorsData] = useState([]);
  const [hospitalsData, setHospitalsData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add doctor modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDocName, setAddDocName] = useState('');
  const [addDocSpec, setAddDocSpec] = useState('General Medicine');
  const [addDocHosp, setAddDocHosp] = useState('Apollo Hospital');
  const [addDocCity, setAddDocCity] = useState('Delhi');
  const [addDocFee, setAddDocFee] = useState('800');
  const [addDocPhone, setAddDocPhone] = useState('+91 98765 43210');
  const [addDocSubmitting, setAddDocSubmitting] = useState(false);
  const [addDocSuccess, setAddDocSuccess] = useState('');

  // Fetch actual doctors and hospitals from FastAPI & persistent registry
  useEffect(() => {
    let active = true;

    async function loadHealthcareData() {
      try {
        setLoading(true);
        setError('');

        const [doctorResponse, hospitalResponse] = await Promise.all([
          getDoctors(),
          getHospitals()
        ]);

        if (!active) return;

        setDoctorsData(doctorResponse.doctors || []);
        setHospitalsData(hospitalResponse.hospitals || []);
      } catch (err) {
        if (active) {
          setError(
            err.message || 'Unable to load doctors and hospitals.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHealthcareData();

    const handleUpdate = () => {
      loadHealthcareData();
    };
    window.addEventListener('hn_doctors_updated', handleUpdate);

    return () => {
      active = false;
      window.removeEventListener('hn_doctors_updated', handleUpdate);
    };
  }, []);

  // Generate specialties from actual doctor records
  const specialties = useMemo(() => {
    const values = doctorsData
      .map((d) => d.doctor_type)
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [doctorsData]);

  // Filter actual doctors
  const doctors = useMemo(
    () =>
      doctorsData.filter((d) => {
        const matchesQuery =
          !query ||
          has(d.doctor_name, query) ||
          has(d.doctor_type, query) ||
          has(d.hospital_name, query);

        const matchesLocation =
          !location ||
          has(d.city, location) ||
          has(d.location, location);

        const matchesSpecialty =
          specialty === 'All' ||
          d.doctor_type === specialty;

        return (
          matchesQuery &&
          matchesLocation &&
          matchesSpecialty
        );
      }),
    [doctorsData, query, location, specialty]
  );

  // Filter actual hospitals
  const hospitals = useMemo(
    () =>
      hospitalsData.filter((h) => {
        const matchesQuery =
          !query ||
          has(h.hospital_name, query);

        const matchesLocation =
          !location ||
          has(h.city, location);

        const matchesSpecialty =
          specialty === 'All' ||
          doctorsData.some(
            (d) =>
              d.hospital_name === h.hospital_name &&
              d.city === h.city &&
              d.doctor_type === specialty
          );

        return (
          matchesQuery &&
          matchesLocation &&
          matchesSpecialty
        );
      }),
    [hospitalsData, doctorsData, query, location, specialty]
  );

  const showDoctors = tab !== 'hospitals';
  const showHospitals = tab !== 'doctors';

  const nothing =
    (!showDoctors || doctors.length === 0) &&
    (!showHospitals || hospitals.length === 0);

  const reset = () => {
    setQuery('');
    setLocation('');
    setSpecialty('All');
  };

  return (
    <div className="page">
      <PageHeader
        title="Doctor & Hospital"
        description="Search doctors and hospitals using our healthcare database."
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} /> Add Doctor
          </button>
        }
      />

      <section className="panel search-panel" aria-label="Search">

        <div className="search-panel__fields">
          <label className="field field--icon">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Doctor or hospital name"
              aria-label="Search doctors and hospitals"
            />
          </label>

          <label className="field field--icon">
            <MapPin size={18} aria-hidden="true" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="City, e.g. Delhi"
              aria-label="Location"
            />
          </label>
        </div>

        {recentHistory.length > 0 && (
          <div className="search-history-chips">
            <span className="search-history-chips__label">
              <History size={13} /> Recent Searches:
            </span>
            {recentHistory.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                className="search-history-chip"
                onClick={() => setQuery(item.query)}
              >
                <Clock size={11} style={{ opacity: 0.7 }} />
                <span>{item.query}</span>
                <span
                  className="search-history-chip__del"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = removeSearchItem(user?.id, item.query);
                    setRecentHistory(updated);
                  }}
                  title="Remove from history"
                >
                  <X size={11} />
                </span>
              </button>
            ))}
            <button
              type="button"
              className="search-history-chips__clear"
              onClick={() => {
                const updated = clearAllSearchHistory(user?.id);
                setRecentHistory(updated);
              }}
            >
              Clear
            </button>
          </div>
        )}

        <div className="chip-row" role="group" aria-label="Specialty">
          {['All', ...specialties].map((s) => (
            <button
              key={s}
              className={`chip chip--btn ${
                specialty === s ? 'is-active' : ''
              }`}
              onClick={() => setSpecialty(s)}
              aria-pressed={specialty === s}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="search-panel__bar">
          <div className="segmented" role="tablist" aria-label="Result type">
            {[
              ['all', 'All'],
              ['doctors', 'Doctors'],
              ['hospitals', 'Hospitals']
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
      </section>

      {loading && (
  <div className="section">
    <div className="section__head">
      <h2>Loading healthcare results...</h2>
    </div>

    <div className="card-grid">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <article className="result-card skeleton-card" key={item}>
          <div className="result-card__top">
            <div className="skeleton skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
            </div>
          </div>

          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-button" />
        </article>
      ))}
    </div>
  </div>
)}

      {!loading && error && (
        <div className="empty">
          <SearchX size={30} aria-hidden="true" />
          <h3>Unable to load data</h3>
          <p>{error}</p>
          <button
            className="btn btn--ghost"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && nothing && (
        <div className="empty">
          <SearchX size={30} aria-hidden="true" />
          <h3>No matches</h3>
          <p>
            Try a different city or specialty, or clear the filters.
          </p>
          <button className="btn btn--ghost" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && showDoctors && doctors.length > 0 && (
        <section className="section" aria-labelledby="doc-h">
          <div className="section__head">
            <h2 id="doc-h">
              Doctors <span className="count">{doctors.length}</span>
            </h2>
          </div>

          <div className="card-grid">
            {doctors.map((d) => (
              <article key={d.doctor_id} className="result-card">

                <div className="result-card__top">
                  <span className="avatar" aria-hidden="true">
                    {initials(d.doctor_name)}
                  </span>

                  <div>
                    <h3>{d.doctor_name}</h3>
                    <p>
                      {d.doctor_type || 'Specialization not available'}
                      {' · '}
                      {d.experience_years} years experience
                    </p>
                  </div>
                </div>

                <ul className="meta">
                  <li>
                    <Building2 size={15} aria-hidden="true" />
                    {d.hospital_name || 'Hospital not available'}
                  </li>

                  <li>
                    <MapPin size={15} aria-hidden="true" />
                    {d.location}, {d.city}
                  </li>

                  <li>
                    <IndianRupee size={15} aria-hidden="true" />
                    {d.fees != null
                      ? `${d.fees} consultation fee`
                      : 'Consultation fee not available'}
                  </li>
                </ul>

                <button
                  className="btn btn--primary btn--block"
                  onClick={() =>
                    navigate('/appointments', {
                      state: {
                        doctorId: d.doctor_id,
                        doctorName: d.doctor_name,
                        hospitalId: d.hospital_id,
                        hospitalName: d.hospital_name,
                        city: d.city,
                      },
                    })
                  }
                >
                  <CalendarPlus size={16} />
                  Book appointment
                </button>

              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && showHospitals && hospitals.length > 0 && (
        <section className="section" aria-labelledby="hos-h">
          <div className="section__head">
            <h2 id="hos-h">
              Hospitals <span className="count">{hospitals.length}</span>
            </h2>
          </div>

          <div className="card-grid">
            {hospitals.map((h) => (
              <article
                key={h.hospital_id}
                className="result-card result-card--hospital"
              >

                <div className="result-card__top">
                  <span
                    className="avatar avatar--square"
                    aria-hidden="true"
                  >
                    <Building2 size={20} />
                  </span>

                  <div>
                    <h3>{h.hospital_name}</h3>
                    <p>{h.city}</p>
                  </div>
                </div>

                <ul className="meta">
                  <li>
                    <UserRound size={15} aria-hidden="true" />
                    {h.doctor_count} associated doctors
                  </li>

                  <li>
                    <MapPin size={15} aria-hidden="true" />
                    {h.city}
                  </li>
                </ul>

                <button
                  className="btn btn--ghost btn--block"
                  onClick={() =>
                    navigate('/appointments', {
                      state: {
                        hospitalId: h.hospital_id,
                        hospitalName: h.hospital_name,
                        city: h.city,
                      }
                    })
                  }
                >
                  <BriefcaseMedical size={16} />
                  Book at this hospital
                </button>

              </article>
            ))}
          </div>
        </section>
      )}

      {showAddModal && (
        <div className="dr-overlay" role="dialog" aria-modal="true">
          <div className="dr-modal dr-modal--wide">
            <div className="dr-modal__head">
              <h2>Add Verified Clinician to Directory</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!addDocName.trim()) return;
                setAddDocSubmitting(true);
                const saved = saveCustomDoctor({
                  name: addDocName.trim(),
                  specialization: addDocSpec.trim(),
                  hospital: addDocHosp.trim(),
                  city: addDocCity.trim(),
                  fees: Number(addDocFee) || 750,
                  phone: addDocPhone.trim(),
                });
                setAddDocSubmitting(false);
                setAddDocSuccess(`Dr. ${saved.doctor_name} added to directory!`);
                setTimeout(() => {
                  setAddDocSuccess('');
                  setShowAddModal(false);
                  setAddDocName('');
                }, 1200);
              }}
            >
              <div className="dr-modal__body">
                {addDocSuccess && (
                  <p style={{ color: '#047857', fontWeight: 600, padding: '0.5rem', background: '#ecfdf5', borderRadius: 'var(--r-md)' }}>
                    ✓ {addDocSuccess}
                  </p>
                )}
                <div className="dr-form-grid">
                  <label className="stack">
                    <span className="label">Doctor Full Name</span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Dr. Rajesh Verma"
                      value={addDocName}
                      onChange={(e) => setAddDocName(e.target.value)}
                    />
                  </label>
                  <label className="stack">
                    <span className="label">Specialization</span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Cardiology"
                      value={addDocSpec}
                      onChange={(e) => setAddDocSpec(e.target.value)}
                    />
                  </label>
                  <label className="stack">
                    <span className="label">Hospital / Clinic</span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Apollo Hospital"
                      value={addDocHosp}
                      onChange={(e) => setAddDocHosp(e.target.value)}
                    />
                  </label>
                  <label className="stack">
                    <span className="label">City</span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Mumbai, Delhi, Bangalore"
                      value={addDocCity}
                      onChange={(e) => setAddDocCity(e.target.value)}
                    />
                  </label>
                  <label className="stack">
                    <span className="label">Consultation Fee (₹)</span>
                    <input
                      className="field"
                      type="number"
                      required
                      placeholder="e.g. 900"
                      value={addDocFee}
                      onChange={(e) => setAddDocFee(e.target.value)}
                    />
                  </label>
                  <label className="stack">
                    <span className="label">Clinic Phone</span>
                    <input
                      className="field"
                      placeholder="+91 98765 43210"
                      value={addDocPhone}
                      onChange={(e) => setAddDocPhone(e.target.value)}
                    />
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
                  disabled={addDocSubmitting}
                >
                  {addDocSubmitting ? 'Saving...' : 'Add to Directory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
