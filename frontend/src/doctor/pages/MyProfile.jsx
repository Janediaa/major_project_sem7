import { useState } from 'react';
import { Briefcase, Building2, IndianRupee, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SampleBadge from '../../components/common/SampleBadge';
import EditProfileModal from '../components/EditProfileModal';
import { useDoctor } from '../DoctorContext';

export default function MyProfile() {
  const { profile, updateProfile } = useDoctor();
  const [editing, setEditing] = useState(false);
  const initials = profile.name.replace('Dr. ', '').split(' ').map((p) => p[0]).join('').slice(0, 2);

  const facts = [
    { icon: Briefcase, label: 'Experience', value: `${profile.experienceYears} years` },
    { icon: Building2, label: 'Hospital / clinic', value: profile.hospital },
    { icon: MapPin, label: 'Location', value: profile.location },
    { icon: IndianRupee, label: 'Consultation fee', value: `₹${profile.fee.toLocaleString('en-IN')}` },
  ];

  return (
    <div className="page">
      <PageHeader
        title="My Profile"
        description="How patients see you. Changes here are not saved to a server yet."
        badge={<SampleBadge>Demo profile</SampleBadge>}
        actions={<button className="btn btn--primary" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profile</button>}
      />

      <section className="dr-profile">
        <div className="dr-profile__card panel">
          <span className="dr-profile__avatar" aria-hidden="true">{initials}</span>
          <h2>{profile.name}</h2>
          <p className="dr-profile__spec">{profile.specialization}</p>
          <p className="muted">{profile.hospital}</p>
          <p className="dr-profile__bio">{profile.bio}</p>
        </div>

        <div className="stack">
          <div className="panel">
            <h2 className="panel__title">Professional details</h2>
            <dl className="dr-facts">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <span className="dr-facts__icon"><Icon size={18} aria-hidden="true" /></span>
                  <div><dt>{label}</dt><dd>{value}</dd></div>
                </div>
              ))}
            </dl>
          </div>

          <div className="panel">
            <h2 className="panel__title">Contact information</h2>
            <dl className="dr-facts">
              <div><span className="dr-facts__icon"><Phone size={18} aria-hidden="true" /></span><div><dt>Phone</dt><dd>{profile.phone}</dd></div></div>
              <div><span className="dr-facts__icon"><Mail size={18} aria-hidden="true" /></span><div><dt>Email</dt><dd>{profile.email}</dd></div></div>
            </dl>
          </div>
        </div>
      </section>

      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSave={updateProfile} />}
    </div>
  );
}
