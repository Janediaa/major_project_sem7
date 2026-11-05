import {
  LayoutDashboard,
  Stethoscope,
  ShieldCheck,
  Activity,
  CalendarCheck2,
  BookOpen,
} from 'lucide-react';

// Single source of truth for the sidebar, topbar title, and dashboard cards.
// status: 'ready'   = backend exists, frontend not wired to it yet
//         'planned' = backend not built yet
export const STATUS = {
  ready: { label: 'Backend built, API not connected', short: 'Ready to connect' },
  planned: { label: 'Backend in development', short: 'Planned' },
};

export const MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    keywords: ['home', 'overview'],
  },
  {
    id: 'doctor-hospital',
    label: 'Doctor & Hospital',
    path: '/doctor-hospital',
    icon: Stethoscope,
    keywords: ['doctor', 'hospital', 'specialist', 'clinic'],
    status: 'planned',
    agents: ['Doctor Agent', 'Hospital Agent'],
    summary: 'Search doctors and hospitals together by specialty and location.',
  },
  {
    id: 'insurance',
    label: 'Insurance',
    path: '/insurance',
    icon: ShieldCheck,
    keywords: ['policy', 'coverage', 'claim', 'cashless'],
    status: 'planned',
    agents: ['Insurance Agent'],
    summary: 'Understand policies, coverage and how claims work.',
  },
  {
    id: 'triage',
    label: 'Triage',
    path: '/triage',
    icon: Activity,
    keywords: ['symptom', 'urgent', 'emergency', 'check'],
    status: 'planned',
    agents: ['Triage Agent'],
    summary: 'Describe symptoms and get guidance on how urgently to seek care.',
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: CalendarCheck2,
    keywords: ['book', 'schedule', 'visit', 'booking'],
    status: 'planned',
    agents: ['Appointment Agent'],
    summary: 'Pick a doctor, a day and a time, and keep track of your visits.',
  },
  {
    id: 'medical-knowledge',
    label: 'Medical Knowledge',
    path: '/medical-knowledge',
    icon: BookOpen,
    keywords: ['rag', 'ask', 'question', 'who', 'knowledge', 'chat'],
    status: 'ready',
    agents: ['RAG Agent'],
    summary: 'Ask medical questions and get answers with WHO source references.',
  },
];

export const AGENT_MODULES = MODULES.filter((m) => m.id !== 'dashboard');
