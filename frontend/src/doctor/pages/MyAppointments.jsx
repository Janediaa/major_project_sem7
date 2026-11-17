import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Search, SearchX, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SampleBadge from '../../components/common/SampleBadge';
import StatusBadge from '../components/StatusBadge';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import RejectModal from '../components/RejectModal';
import { useDoctor } from '../DoctorContext';
import { formatDate, timeToMinutes } from '../data/mockDoctorData';

const FILTERS = [['all', 'All'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['rejected', 'Rejected'], ['completed', 'Completed']];

export default function MyAppointments() {
  const { appointments, setStatus } = useDoctor();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [filter, setFilter] = useState('all');
  const [detailsId, setDetailsId] = useState(null);
  const [rejectId, setRejectId] = useState(null);

  const counts = useMemo(() => {
    const c = { all: appointments.length };
    FILTERS.slice(1).forEach(([id]) => { c[id] = appointments.filter((a) => a.status === id).length; });
    return c;
  }, [appointments]);

  const rows = useMemo(
    () =>
      appointments
        .filter((a) => (filter === 'all' || a.status === filter) && (!query || a.patient.toLowerCase().includes(query.toLowerCase())))
        .sort((a, b) => b.date.localeCompare(a.date) || timeToMinutes(b.time) - timeToMinutes(a.time)),
    [appointments, filter, query]
  );

  const details = appointments.find((a) => a.id === detailsId);
  const rejecting = appointments.find((a) => a.id === rejectId);

  return (
    <div className="page">
      <PageHeader
        title="My Appointments"
        description="Every appointment, newest first. Open one to see the patient’s details."
        badge={<SampleBadge>Demo data</SampleBadge>}
      />

      <div className="dr-toolbar">
        <div className="segmented segmented--wrap" role="tablist" aria-label="Filter by status">
          {FILTERS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>
              {label} <span className="dr-pill-count">{counts[id]}</span>
            </button>
          ))}
        </div>
        <label className="field field--icon dr-toolbar__search">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} placeholder="Search patient name" aria-label="Search patient name" />
          {query && <button type="button" className="dr-eye" onClick={() => setParams({}, { replace: true })} aria-label="Clear search"><X size={16} /></button>}
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <SearchX size={30} aria-hidden="true" />
          <h3>No appointments found</h3>
          <p>Try a different status or clear the search.</p>
          <button className="btn btn--ghost" onClick={() => { setFilter('all'); setParams({}, { replace: true }); }}>Show all</button>
        </div>
      ) : (
        <div className="panel dr-table-panel">
          <table className="table dr-table">
            <thead>
              <tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason for visit</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td data-label="Patient"><strong>{a.patient}</strong><small className="muted dr-block">{a.age} · {a.gender}</small></td>
                  <td data-label="Date">{formatDate(a.date)}</td>
                  <td data-label="Time">{a.time}</td>
                  <td data-label="Reason">{a.reason}</td>
                  <td data-label="Status"><StatusBadge status={a.status} /></td>
                  <td className="dr-table__actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => setDetailsId(a.id)}><Eye size={15} /> View details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details && (
        <AppointmentDetailsModal
          appointment={details}
          onClose={() => setDetailsId(null)}
          onAccept={(id) => setStatus(id, 'confirmed')}
          onComplete={(id) => setStatus(id, 'completed')}
          onReject={(id) => { setDetailsId(null); setRejectId(id); }}
        />
      )}
      {rejecting && (
        <RejectModal appointment={rejecting} onCancel={() => setRejectId(null)} onConfirm={(reason) => { setStatus(rejecting.id, 'rejected', reason); setRejectId(null); }} />
      )}
    </div>
  );
}
