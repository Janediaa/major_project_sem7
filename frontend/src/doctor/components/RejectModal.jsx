import { useState } from 'react';
import Modal from './Modal';
import { formatDate } from '../data/mockDoctorData';

const QUICK_REASONS = ['Outside my available hours', 'Please book a different specialty', 'Fully booked at this time'];

export default function RejectModal({ appointment, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('Enter a reason of at least 5 characters so the patient knows why.');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Modal
      title="Reject appointment request"
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onCancel}>Keep request</button>
          <button className="btn dr-btn-danger" type="submit" form="reject-form">Reject request</button>
        </>
      }
    >
      <p className="muted">
        {appointment.patient} · {formatDate(appointment.date)}, {appointment.time}
      </p>
      <form id="reject-form" className="stack" onSubmit={submit} noValidate>
        <label className="stack">
          <span className="label">Reason for rejecting</span>
          <textarea
            className="field field--area"
            rows={4}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="This message will be shown to the patient once the backend is connected."
            autoFocus
          />
        </label>
        <div className="chip-row">
          {QUICK_REASONS.map((r) => (
            <button type="button" key={r} className="chip chip--btn" onClick={() => { setReason(r); setError(''); }}>{r}</button>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
