import { useState } from 'react';
import { CalendarDays, Check, Clock, Inbox, Phone, TriangleAlert, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import RejectModal from '../components/RejectModal';
import { useDoctor } from '../DoctorContext';
import { formatDate, timeToMinutes } from '../data/mockDoctorData';

export default function AppointmentRequests() {
  const { appointments, setStatus } = useDoctor();
  const [rejectId, setRejectId] = useState(null);

  const pending = appointments
    .filter((a) => a.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time));
  const rejecting = appointments.find((a) => a.id === rejectId);

  const clash = (a) => appointments.find((x) => x.id !== a.id && x.status === 'confirmed' && x.date === a.date && x.time === a.time);

  return (
    <div className="page">
      <PageHeader
        title="Appointment Requests"
        description="Accept or reject requests from patients. The list updates as you respond."
        badge={
          <span className="role-badge role-badge--doctor" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Inbox size={12} /> Live Queue
          </span>
        }
      />

      {pending.length === 0 ? (
        <div className="empty">
          <Inbox size={30} aria-hidden="true" />
          <h3>You’re all caught up</h3>
          <p>New requests from patients will appear here.</p>
        </div>
      ) : (
        <div className="dr-requests">
          {pending.map((a) => {
            const conflict = clash(a);
            return (
              <article key={a.id} className="dr-request">
                <header className="dr-request__head">
                  <span className="avatar" aria-hidden="true">{a.patient.split(' ').map((p) => p[0]).join('')}</span>
                  <div>
                    <h3>{a.patient}</h3>
                    <p className="muted">{a.age} years · {a.gender}</p>
                  </div>
                  {a.requested && <small className="dr-request__ago">Requested {a.requested}</small>}
                </header>

                <ul className="dr-detail__list">
                  <li><CalendarDays size={16} aria-hidden="true" /> {formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}</li>
                  <li><Clock size={16} aria-hidden="true" /> {a.time}</li>
                  <li><Phone size={16} aria-hidden="true" /> {a.phone}</li>
                </ul>

                <div className="dr-detail__block">
                  <h4>{a.reason}</h4>
                  <p>{a.notes}</p>
                </div>

                {conflict && (
                  <p className="dr-warn"><TriangleAlert size={16} aria-hidden="true" /> You already have a confirmed appointment with {conflict.patient} at this time.</p>
                )}

                <div className="row dr-request__actions">
                  <button className="btn btn--primary" onClick={() => setStatus(a.id, 'confirmed')}><Check size={16} /> Accept</button>
                  <button className="btn dr-btn-danger-outline" onClick={() => setRejectId(a.id)}><X size={16} /> Reject</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {rejecting && (
        <RejectModal appointment={rejecting} onCancel={() => setRejectId(null)} onConfirm={(reason) => { setStatus(rejecting.id, 'rejected', reason); setRejectId(null); }} />
      )}
    </div>
  );
}
