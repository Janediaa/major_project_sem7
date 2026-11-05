// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA — frontend prototype only.
// Every name, rating, price and slot below is invented for UI demonstration.
// Replace each export with data from the matching agent's API when connected.
// ─────────────────────────────────────────────────────────────────────────────

export const SPECIALTIES = [
  'General medicine',
  'Pulmonology',
  'Cardiology',
  'Endocrinology',
  'Neurology',
  'Psychiatry',
  'Oncology',
];

export const HOSPITALS = [
  {
    id: 'h1',
    name: 'Riverside Medical Centre',
    city: 'Delhi',
    type: 'Multispeciality',
    rating: 4.6,
    reviews: 1280,
    emergency: true,
    specialties: ['General medicine', 'Pulmonology', 'Cardiology', 'Oncology'],
  },
  {
    id: 'h2',
    name: 'Lakeview Heart Institute',
    city: 'Noida',
    type: 'Cardiac care',
    rating: 4.8,
    reviews: 640,
    emergency: true,
    specialties: ['Cardiology', 'General medicine'],
  },
  {
    id: 'h3',
    name: 'Greenfield Hospital',
    city: 'Gurugram',
    type: 'Multispeciality',
    rating: 4.3,
    reviews: 910,
    emergency: false,
    specialties: ['Endocrinology', 'Neurology', 'Psychiatry', 'General medicine'],
  },
  {
    id: 'h4',
    name: 'Sunrise Chest & Allergy Clinic',
    city: 'Delhi',
    type: 'Specialty clinic',
    rating: 4.5,
    reviews: 310,
    emergency: false,
    specialties: ['Pulmonology'],
  },
  {
    id: 'h5',
    name: 'Meadow Mind & Brain Centre',
    city: 'Noida',
    type: 'Neuro & mental health',
    rating: 4.4,
    reviews: 275,
    emergency: false,
    specialties: ['Neurology', 'Psychiatry'],
  },
];

export const DOCTORS = [
  { id: 'd1', name: 'Dr. Ananya Rao', specialty: 'Pulmonology', hospitalId: 'h4', city: 'Delhi', years: 14, rating: 4.7, reviews: 212, nextSlot: 'Today, 4:30 PM', availableToday: true, languages: 'English, Hindi' },
  { id: 'd2', name: 'Dr. Vikram Sethi', specialty: 'Cardiology', hospitalId: 'h2', city: 'Noida', years: 20, rating: 4.9, reviews: 388, nextSlot: 'Tomorrow, 10:00 AM', availableToday: false, languages: 'English, Hindi' },
  { id: 'd3', name: 'Dr. Meera Iyer', specialty: 'Endocrinology', hospitalId: 'h3', city: 'Gurugram', years: 11, rating: 4.6, reviews: 164, nextSlot: 'Today, 6:00 PM', availableToday: true, languages: 'English, Tamil' },
  { id: 'd4', name: 'Dr. Rohan Kapoor', specialty: 'General medicine', hospitalId: 'h1', city: 'Delhi', years: 9, rating: 4.4, reviews: 421, nextSlot: 'Today, 11:15 AM', availableToday: true, languages: 'English, Hindi, Punjabi' },
  { id: 'd5', name: 'Dr. Sana Qureshi', specialty: 'Psychiatry', hospitalId: 'h5', city: 'Noida', years: 12, rating: 4.8, reviews: 203, nextSlot: 'Thu, 2:00 PM', availableToday: false, languages: 'English, Hindi, Urdu' },
  { id: 'd6', name: 'Dr. Arjun Nair', specialty: 'Neurology', hospitalId: 'h3', city: 'Gurugram', years: 17, rating: 4.5, reviews: 187, nextSlot: 'Tomorrow, 3:30 PM', availableToday: false, languages: 'English, Malayalam' },
  { id: 'd7', name: 'Dr. Kavya Menon', specialty: 'Oncology', hospitalId: 'h1', city: 'Delhi', years: 15, rating: 4.7, reviews: 156, nextSlot: 'Fri, 9:30 AM', availableToday: false, languages: 'English, Hindi' },
  { id: 'd8', name: 'Dr. Imran Sheikh', specialty: 'Pulmonology', hospitalId: 'h1', city: 'Delhi', years: 8, rating: 4.2, reviews: 98, nextSlot: 'Today, 5:45 PM', availableToday: true, languages: 'English, Hindi' },
];

export const POLICIES = [
  {
    id: 'p1',
    name: 'Essential Health Cover',
    kind: 'Individual',
    sumInsured: '₹5 lakh',
    highlights: ['Hospital stays and surgery', 'Day-care procedures', 'Ambulance charges'],
    coverage: [
      { item: 'Hospitalisation (24h+)', status: 'Covered', note: 'Room rent capped per day' },
      { item: 'Day-care procedures', status: 'Covered', note: 'Listed procedures only' },
      { item: 'Pre & post hospitalisation', status: 'Limited', note: '30 days before, 60 days after' },
      { item: 'Maternity', status: 'Not covered', note: 'Not part of this plan' },
      { item: 'Pre-existing conditions', status: 'Limited', note: 'After a waiting period' },
    ],
  },
  {
    id: 'p2',
    name: 'Family Floater Plus',
    kind: 'Family',
    sumInsured: '₹10 lakh',
    highlights: ['One cover shared by the family', 'Maternity benefit', 'Annual health check-up'],
    coverage: [
      { item: 'Hospitalisation (24h+)', status: 'Covered', note: 'No room rent cap' },
      { item: 'Day-care procedures', status: 'Covered', note: 'Wider procedure list' },
      { item: 'Pre & post hospitalisation', status: 'Covered', note: '60 days before, 90 days after' },
      { item: 'Maternity', status: 'Limited', note: 'After a waiting period' },
      { item: 'Pre-existing conditions', status: 'Limited', note: 'After a shorter waiting period' },
    ],
  },
  {
    id: 'p3',
    name: 'Senior Care Shield',
    kind: 'Age 60+',
    sumInsured: '₹7 lakh',
    highlights: ['Designed for ages 60 and above', 'Domiciliary treatment', 'Co-payment applies'],
    coverage: [
      { item: 'Hospitalisation (24h+)', status: 'Covered', note: 'Co-payment applies' },
      { item: 'Day-care procedures', status: 'Covered', note: 'Listed procedures only' },
      { item: 'Pre & post hospitalisation', status: 'Limited', note: '30 days before, 60 days after' },
      { item: 'Maternity', status: 'Not covered', note: 'Not applicable' },
      { item: 'Pre-existing conditions', status: 'Covered', note: 'After a waiting period' },
    ],
  },
];

export const CLAIM_STEPS = [
  { title: 'Inform the insurer', text: 'Tell your insurer about the admission, ideally before a planned one or within 24 hours of an emergency.' },
  { title: 'Choose cashless or reimbursement', text: 'At a network hospital the bill can be settled directly. Elsewhere you pay first and claim later.' },
  { title: 'Submit documents', text: 'Policy details, ID, discharge summary, bills and prescriptions.' },
  { title: 'Track the settlement', text: 'The insurer reviews the claim and may ask for more documents.' },
];

export const INSURANCE_SUGGESTIONS = [
  'Is a day-care procedure covered?',
  'What is a waiting period?',
  'How does a cashless claim work?',
  'What does co-payment mean?',
];

export const ACTIVITY = [
  { id: 'a1', module: 'medical-knowledge', text: 'Asked about common symptoms of asthma', time: '2 min ago' },
  { id: 'a2', module: 'doctor-hospital', text: 'Searched pulmonologists in Delhi', time: '1 hour ago' },
  { id: 'a3', module: 'triage', text: 'Completed a symptom check', time: 'Yesterday' },
  { id: 'a4', module: 'appointments', text: 'Viewed an upcoming appointment', time: 'Yesterday' },
];

export const NOTIFICATIONS = [
  { id: 'n1', text: 'Appointment reminders will appear here once the Appointment Agent is connected.' },
  { id: 'n2', text: 'Claim updates will appear here once the Insurance Agent is connected.' },
];

export const TIME_SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '11:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '04:30 PM', '05:00 PM', '06:00 PM'];

export const APPOINTMENT_HISTORY = [
  { id: 'ap1', doctor: 'Dr. Vikram Sethi', hospital: 'Lakeview Heart Institute', when: 'Upcoming · sample date', time: '10:00 AM', status: 'upcoming', demo: false },
  { id: 'ap2', doctor: 'Dr. Meera Iyer', hospital: 'Greenfield Hospital', when: 'Past · sample date', time: '06:00 PM', status: 'past', demo: false },
  { id: 'ap3', doctor: 'Dr. Rohan Kapoor', hospital: 'Riverside Medical Centre', when: 'Past · sample date', time: '11:15 AM', status: 'past', demo: false },
];

export const RAG_SUGGESTIONS = [
  'What are the common symptoms of asthma?',
  'What are the symptoms of diabetes?',
  'How is high blood pressure detected?',
  'What are the warning signs of a stroke?',
  'How is tuberculosis spread?',
  'What is depression and how is it treated?',
];

export const RAG_TOPICS = ['Asthma', 'Cancer', 'Cardiovascular diseases', 'COPD', 'Depression', 'Diabetes', 'HIV/AIDS', 'Hypertension', 'Stroke', 'Tuberculosis'];

// Sample chat answers. Source shape mirrors the planned RAG response:
// title, organisation, url, optional publication date.
export const RAG_SAMPLE_ANSWERS = [
  {
    match: ['asthma'],
    answer:
      'Common symptoms of asthma include wheezing, shortness of breath, chest tightness and coughing. Symptoms often come in episodes and may be worse at night or early in the morning, or when triggered by things like exercise, cold air or allergens.',
    sources: [
      { id: 's1', title: 'Asthma', organization: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/asthma', published: '2024-05-06' },
    ],
  },
  {
    match: ['diabetes', 'blood sugar'],
    answer:
      'Typical symptoms of diabetes include increased thirst, frequent urination, tiredness, blurred vision and unexplained weight loss. Some people, especially with type 2 diabetes, have mild symptoms or none for years, so testing is the only way to know.',
    sources: [
      { id: 's1', title: 'Diabetes', organization: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/diabetes', published: null },
    ],
  },
  {
    match: ['blood pressure', 'hypertension'],
    answer:
      'High blood pressure is detected by measuring it with a blood pressure monitor, ideally on more than one occasion. Many people have no symptoms, which is why regular checks matter.',
    sources: [
      { id: 's1', title: 'Hypertension', organization: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension', published: null },
    ],
  },
];

export const RAG_FALLBACK_ANSWER =
  'This is a sample reply. In the connected version, your question will be answered by the Medical Knowledge Assistant using passages retrieved from the WHO documents in the knowledge base, and the supporting sources will be listed below the answer.';
