// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — Doctor Portal prototype only.
// Every patient, date, fee and contact detail is invented. Dates are generated
// relative to today so the dashboard always has something to show.
// Replace with API data when the backend is connected.
// ─────────────────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (n, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
};
export const todayISO = () => toISO(new Date());

export const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const formatDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  parseISO(iso).toLocaleDateString('en-IN', opts);

export const timeToMinutes = (t) => {
  const [hm, ap] = t.split(' ');
  let [h, m] = hm.split(':').map(Number);
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

export const DEMO_DOCTOR = {
  name: 'Dr. Ananya Rao',
  specialization: 'Pulmonology',
  experienceYears: 14,
  hospital: 'Sunrise Chest & Allergy Clinic',
  location: 'Delhi',
  fee: 800,
  phone: '+91 90000 00000',
  email: 'doctor@healthnavigator.ai',
  bio: 'Senior Pulmonologist and Clinical Lead focusing on asthma, COPD, and outpatient respiratory care.',
};

// [dayOffset, time, patient, age, gender, reason, status, notes, requested]
const ROWS = [
  [-3, '10:00 AM', 'Rahul Verma', 34, 'Male', 'Asthma follow-up', 'completed', 'Using inhaler twice a day. Wants to review the dose.'],
  [-3, '11:30 AM', 'Priya Sharma', 29, 'Female', 'Persistent cough', 'completed', 'Cough for about three weeks, worse at night.'],
  [-2, '09:30 AM', 'Mohan Das', 61, 'Male', 'COPD review', 'completed', 'Routine six-month review.'],
  [-2, '02:00 PM', 'Neha Kapoor', 41, 'Female', 'Allergy-related wheezing', 'rejected', 'Wheezing in spring.', null, 'Outside my clinic days. Please book with the allergy clinic.'],
  [-1, '04:00 PM', 'Aditya Singh', 8, 'Male', 'Recurrent cough', 'completed', 'Parent attending. Cough after colds.'],
  [0, '09:00 AM', 'Sunita Rao', 52, 'Female', 'Spirometry results review', 'completed', 'Brings test report.'],
  [0, '11:00 AM', 'Karan Malhotra', 37, 'Male', 'Sleep apnea consultation', 'confirmed', 'Snoring and daytime tiredness.'],
  [0, '03:30 PM', 'Farah Khan', 46, 'Female', 'Shortness of breath on exertion', 'confirmed', 'Notices it when climbing stairs.'],
  [0, '05:00 PM', 'Vivek Joshi', 58, 'Male', 'Post-TB follow-up', 'pending', 'Finished treatment last month.', '2 hours ago'],
  [1, '10:00 AM', 'Isha Bansal', 23, 'Female', 'Inhaler technique check', 'confirmed', 'New to inhalers.'],
  [1, '10:00 AM', 'Dev Patel', 67, 'Male', 'Chest tightness evaluation', 'pending', 'Tightness in the morning for two weeks.', '5 hours ago'],
  [1, '04:00 PM', 'Anjali Mehra', 31, 'Female', 'Asthma follow-up', 'pending', 'Needs a refill and a review.', '1 day ago'],
  [2, '09:30 AM', 'Rajiv Nair', 49, 'Male', 'Persistent cough', 'confirmed', 'Smoker, wants to quit.'],
  [2, '11:30 AM', 'Tara Bose', 27, 'Female', 'Allergy-related wheezing', 'pending', 'Dust allergy suspected.', '3 hours ago'],
  [4, '10:30 AM', 'Mohan Das', 61, 'Male', 'COPD review', 'confirmed', 'Follow-up on medication change.'],
  [4, '02:30 PM', 'Neha Kapoor', 41, 'Female', 'Allergy-related wheezing', 'pending', 'Rebooking after earlier request.', '1 day ago'],
  [5, '03:00 PM', 'Rahul Verma', 34, 'Male', 'Asthma follow-up', 'pending', 'Wants to discuss exercise-triggered symptoms.', '30 minutes ago'],
];

const PHONES = ['+91 90000 11111', '+91 90000 22222', '+91 90000 33333', '+91 90000 44444'];

export const makeAppointments = () =>
  ROWS.map((r, i) => ({
    id: `ap-${pad(i + 1)}`,
    date: toISO(addDays(r[0])),
    time: r[1],
    patient: r[2],
    age: r[3],
    gender: r[4],
    reason: r[5],
    status: r[6],
    notes: r[7],
    requested: r[8] ?? null,
    rejectionReason: r[9] ?? '',
    phone: PHONES[i % PHONES.length],
  }));

export const INITIAL_ACTIVITY = [
  { id: 'ac1', text: 'Vivek Joshi requested a post-TB follow-up', time: '2 hours ago' },
  { id: 'ac2', text: 'Sunita Rao’s visit was marked completed', time: 'Today' },
  { id: 'ac3', text: 'Tara Bose requested an allergy consultation', time: '3 hours ago' },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const INITIAL_AVAILABILITY = {
  duration: 30,
  days: DAYS.map((name, i) => ({
    name,
    working: i < 6,
    start: '09:00',
    end: i === 5 ? '13:00' : '17:00',
  })),
  unavailableDates: [
    { id: 'u1', date: toISO(addDays(10)), reason: 'Conference' },
    { id: 'u2', date: toISO(addDays(12)), reason: 'Personal leave' },
  ],
};

export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  completed: 'Completed',
};
