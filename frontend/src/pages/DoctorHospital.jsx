
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarPlus,
  IndianRupee,
  MapPin,
  Search,
  SearchX,
  UserRound,
  BriefcaseMedical
} from 'lucide-react';

import PageHeader from '../components/common/PageHeader';
import { getDoctors, getHospitals } from '../services/healthcareService';

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

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [tab, setTab] = useState('all');

  const [doctorsData, setDoctorsData] = useState([]);
  const [hospitalsData, setHospitalsData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch actual doctors and hospitals from FastAPI
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

    return () => {
      active = false;
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
      />

      <section className="panel search-panel" aria-label="Search">

        <div className="search-panel__fields">
          <label className="field field--icon">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Doctor or hospital name"
              aria-label="Search doctors and hospitals"
            />
          </label>

          <label className="field field--icon">
            <MapPin size={18} aria-hidden="true" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, e.g. Delhi"
              aria-label="Location"
            />
          </label>
        </div>

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

    </div>
  );
}
