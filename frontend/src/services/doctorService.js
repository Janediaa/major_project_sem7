import {
  cancelAppointment,
  getAppointments,
  getDoctorAvailability as apiGetDoctorAvailability,
  getDoctorSchedule,
  updateAppointmentStatus,
} from './appointmentService';
import {
  DEMO_DOCTOR,
  INITIAL_ACTIVITY,
  INITIAL_AVAILABILITY,
  makeAppointments,
} from '../doctor/data/mockDoctorData';

export const DOCTOR_STORAGE_KEYS = {
  APPOINTMENTS: 'hn_doctor_appointments',
  PROFILE: 'hn_doctor_profile',
  AVAILABILITY: 'hn_doctor_availability',
  ACTIVITY: 'hn_doctor_activity',
  USER_BOOKINGS: 'hn_user_bookings',
};

// Map backend status strings to Doctor Portal status strings
export function mapBackendStatusToDoctor(backendStatus) {
  const s = String(backendStatus || '').toLowerCase();
  if (s === 'scheduled') return 'confirmed';
  if (s === 'attended') return 'completed';
  if (s === 'cancelled' || s === 'did not attend') return 'rejected';
  if (s === 'pending') return 'pending';
  return 'confirmed';
}

// Convert a backend appointment record into the Doctor Portal appointment shape
export function formatBackendAppointment(rec, index = 0) {
  const pad = (n) => String(n).padStart(2, '0');
  const appointmentId = rec.appointment_id || rec.id || `rec-${pad(index + 1)}`;
  return {
    id: `ap-${appointmentId}`,
    backendId: rec.appointment_id || null,
    bookingReference: rec.booking_reference || `BK-${pad(index + 100)}`,
    date: rec.appointment_date || new Date().toISOString().split('T')[0],
    time: rec.display_time || rec.appointment_time || '10:00 AM',
    patient: rec.patient_name || rec.patient || 'Outpatient',
    age: rec.patient_age || rec.age || 35,
    gender: rec.patient_sex || rec.gender || 'Not specified',
    reason: rec.reason || 'General Medical Consultation',
    status: mapBackendStatusToDoctor(rec.status),
    notes: rec.reason || rec.notes || 'Referred for specialist evaluation.',
    requested: rec.source === 'user_booking' ? 'Patient Portal' : 'Clinic OPD',
    rejectionReason: rec.rejectionReason || '',
    phone: rec.patient_phone || rec.phone || '+91 98765 43210',
    source: rec.source || 'user_booking',
  };
}

// Load appointments from backend API, persistent localStorage, and seed mock data
export async function getLiveDoctorAppointments(doctorId = 1) {
  let stored = [];
  try {
    const rawStored = localStorage.getItem(DOCTOR_STORAGE_KEYS.APPOINTMENTS);
    if (rawStored) stored = JSON.parse(rawStored);
  } catch (err) {
    console.warn('Failed to parse local doctor appointments:', err);
  }

  // Also read any patient bookings made in the patient portal
  let userBookings = [];
  try {
    const rawUserBookings = localStorage.getItem(DOCTOR_STORAGE_KEYS.USER_BOOKINGS);
    if (rawUserBookings) userBookings = JSON.parse(rawUserBookings);
  } catch (err) {
    console.warn('Failed to parse user bookings:', err);
  }

  // Fetch live appointments from backend API if available
  let apiAppointments = [];
  try {
    const apiRes = await getAppointments({ doctorId, limit: 50 });
    if (apiRes && Array.isArray(apiRes.appointments)) {
      apiAppointments = apiRes.appointments.map((a, i) => formatBackendAppointment(a, i));
    }
  } catch (err) {
    console.info('Backend appointment fetch offline or degraded, using persistent cache:', err.message);
  }

  // Transform user bookings into doctor appointment format
  const formattedUserBookings = userBookings.map((b, i) => ({
    id: `usr-${b.appointment_id || b.booking_reference || i}`,
    backendId: b.appointment_id || null,
    bookingReference: b.booking_reference,
    date: b.appointment_date || new Date().toISOString().split('T')[0],
    time: b.display_time || b.appointment_time || '10:00 AM',
    patient: b.patient_name || 'Patient',
    age: b.patient_age || 28,
    gender: b.patient_sex || 'Female',
    reason: b.reason || 'Specialist Consultation',
    status: b.status === 'cancelled' ? 'rejected' : b.status === 'attended' ? 'completed' : 'confirmed',
    notes: b.reason || 'Booked online via patient portal.',
    requested: 'Patient Portal',
    rejectionReason: '',
    phone: b.patient_phone || '+91 98765 43210',
    source: 'user_booking',
  }));

  // Merge and deduplicate by bookingReference or id
  const existingMap = new Map();

  // If stored exists, load it first
  if (Array.isArray(stored) && stored.length > 0) {
    stored.forEach((item) => existingMap.set(item.id, item));
  } else {
    // Seed with baseline appointments so the portal has active clinical queue
    makeAppointments().forEach((item) => existingMap.set(item.id, item));
  }

  // Overlay API appointments
  apiAppointments.forEach((item) => {
    if (!existingMap.has(item.id)) {
      existingMap.set(item.id, item);
    }
  });

  // Overlay user bookings from the patient portal (newest at the front)
  formattedUserBookings.forEach((item) => {
    existingMap.set(item.id, item);
  });

  const merged = Array.from(existingMap.values());
  try {
    localStorage.setItem(DOCTOR_STORAGE_KEYS.APPOINTMENTS, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save merged appointments to storage:', err);
  }

  return merged;
}

// Persist doctor appointment status update
export async function persistAppointmentStatus(id, nextStatus, rejectionReason = '') {
  let appointments = [];
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEYS.APPOINTMENTS);
    appointments = raw ? JSON.parse(raw) : [];
  } catch {
    appointments = [];
  }

  const target = appointments.find((a) => a.id === id);
  const updated = appointments.map((a) =>
    a.id === id ? { ...a, status: nextStatus, rejectionReason, requested: null } : a
  );

  try {
    localStorage.setItem(DOCTOR_STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to write updated appointments:', err);
  }

  // Also update corresponding record in user bookings if present
  if (target) {
    try {
      const rawUserBookings = localStorage.getItem(DOCTOR_STORAGE_KEYS.USER_BOOKINGS);
      if (rawUserBookings) {
        const bookings = JSON.parse(rawUserBookings);
        const mappedUserStatus =
          nextStatus === 'rejected' ? 'cancelled' : nextStatus === 'completed' ? 'attended' : 'scheduled';
        const updatedBookings = bookings.map((b) =>
          b.booking_reference === target.bookingReference || b.appointment_id === target.backendId
            ? { ...b, status: mappedUserStatus }
            : b
        );
        localStorage.setItem(DOCTOR_STORAGE_KEYS.USER_BOOKINGS, JSON.stringify(updatedBookings));
      }
    } catch (err) {
      console.warn('Failed to update user booking sync:', err);
    }

    // If backend ID is present, update status on backend API
    if (target.backendId) {
      try {
        if (nextStatus === 'rejected') {
          await cancelAppointment(target.backendId);
        } else {
          await updateAppointmentStatus(target.backendId, nextStatus, rejectionReason);
        }
      } catch (err) {
        console.info('Backend status update attempted:', err.message);
      }
    }
  }

  // Notify listeners that appointments changed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hn_appointments_updated', { detail: { id, nextStatus } }));
  }

  return updated;
}

// Load doctor profile from persistent storage or default
export function getStoredDoctorProfile() {
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEYS.PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read stored doctor profile:', err);
  }
  return DEMO_DOCTOR;
}

// Save doctor profile to persistent storage
export function saveDoctorProfile(profile) {
  try {
    localStorage.setItem(DOCTOR_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to save doctor profile:', err);
  }
  return profile;
}

// Load doctor availability from persistent storage or default
export function getStoredDoctorAvailability() {
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEYS.AVAILABILITY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read stored doctor availability:', err);
  }
  return INITIAL_AVAILABILITY;
}

// Save doctor availability to persistent storage
export function saveDoctorAvailability(availability) {
  try {
    localStorage.setItem(DOCTOR_STORAGE_KEYS.AVAILABILITY, JSON.stringify(availability));
  } catch (err) {
    console.warn('Failed to save doctor availability:', err);
  }
  return availability;
}

// Load doctor activity log from persistent storage or default
export function getStoredDoctorActivity() {
  try {
    const raw = localStorage.getItem(DOCTOR_STORAGE_KEYS.ACTIVITY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read stored doctor activity:', err);
  }
  return INITIAL_ACTIVITY;
}

// Save doctor activity log to persistent storage
export function appendDoctorActivity(text) {
  const current = getStoredDoctorActivity();
  const next = [{ id: `ac-${Date.now()}`, text, time: 'Just now' }, ...current].slice(0, 15);
  try {
    localStorage.setItem(DOCTOR_STORAGE_KEYS.ACTIVITY, JSON.stringify(next));
  } catch (err) {
    console.warn('Failed to save doctor activity:', err);
  }
  return next;
}
