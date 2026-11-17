import { CalendarDays, Clock, Phone, Stethoscope, UserRound } from 'lucide-react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { formatDate } from '../data/mockDoctorData';

export default function AppointmentDetailsModal({ appointment: a, onClose, onAccept, onReject, onComplete }) {
  return (
    <Modal
      title="Appointment details"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Close</button>
          {a.status === 'pending' && (
            <>
              <button className="btn dr-btn-danger-outline" type="button" onClick={() => onReject(a.id)}>Reject</button>
              <button className="btn btn--primary" type="button" onClick={() => { onAccept(a.id); onClose(); }}>Accept</button>
            </>
          )}
          {a.status === 'confirmed' && (
            <button className="btn btn--primary" type="button" onClick={() => { onComplete(a.id); onClose(); }}>Mark as completed</button>
          )}
        </>
      }
    >
      <div className="dr-detail__top">
        <span className="avatar" aria-hidden="true">{a.patient.split(' ').map((p) => p[0]).join('')}</span>
        <div>
          <h3>{a.patient}</h3>
          <p className="muted">{a.age} years · {a.gender}</p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      <ul className="dr-detail__list">
        <li><CalendarDays size={16} aria-hidden="true" /> {formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}</li>
        <li><Clock size={16} aria-hidden="true" /> {a.time}</li>
        <li><Stethoscope size={16} aria-hidden="true" /> {a.reason}</li>
        <li><Phone size={16} aria-hidden="true" /> {a.phone}</li>
      </ul>

      <div className="dr-detail__block">
        <h4><UserRound size={15} aria-hidden="true" /> Notes from the patient</h4>
        <p>{a.notes}</p>
      </div>

      {a.status === 'rejected' && a.rejectionReason && (
        <div className="dr-detail__block dr-detail__block--danger">
          <h4>Rejection reason</h4>
          <p>{a.rejectionReason}</p>
        </div>
      )}
    </Modal>
  );
}
