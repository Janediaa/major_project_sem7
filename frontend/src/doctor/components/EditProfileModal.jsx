import { useState } from 'react';
import Modal from './Modal';

export default function EditProfileModal({ profile, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...profile, experienceYears: String(profile.experienceYears), fee: String(profile.fee) });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!draft.name.trim()) err.name = 'Enter your name.';
    if (!draft.specialization.trim()) err.specialization = 'Enter your specialization.';
    if (draft.experienceYears === '' || Number(draft.experienceYears) < 0) err.experienceYears = 'Enter years of experience (0 or more).';
    if (draft.fee === '' || Number(draft.fee) < 0) err.fee = 'Enter a fee of 0 or more.';
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) err.email = 'Enter a valid email address.';
    setErrors(err);
    if (Object.keys(err).length) return;
    onSave({ ...draft, name: draft.name.trim(), experienceYears: Number(draft.experienceYears), fee: Number(draft.fee) });
    onClose();
  };

  const Field = ({ id, label, type = 'text', ...rest }) => (
    <label className="stack">
      <span className="label">{label}</span>
      <input className="field" type={type} value={draft[id]} onChange={set(id)} aria-invalid={!!errors[id]} {...rest} />
      {errors[id] && <span className="form-error" role="alert">{errors[id]}</span>}
    </label>
  );

  return (
    <Modal
      title="Edit profile"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" type="submit" form="profile-form">Save changes</button>
        </>
      }
    >
      <form id="profile-form" className="dr-form-grid" onSubmit={submit} noValidate>
        {Field({ id: 'name', label: 'Full name' })}
        {Field({ id: 'specialization', label: 'Specialization' })}
        {Field({ id: 'experienceYears', label: 'Experience (years)', type: 'number', min: 0 })}
        {Field({ id: 'fee', label: 'Consultation fee (₹)', type: 'number', min: 0 })}
        {Field({ id: 'hospital', label: 'Hospital / clinic' })}
        {Field({ id: 'location', label: 'Location' })}
        {Field({ id: 'phone', label: 'Phone', type: 'tel' })}
        {Field({ id: 'email', label: 'Email', type: 'email' })}
        <label className="stack dr-form-grid__wide">
          <span className="label">About</span>
          <textarea className="field field--area" rows={3} value={draft.bio} onChange={set('bio')} />
        </label>
      </form>
    </Modal>
  );
}
