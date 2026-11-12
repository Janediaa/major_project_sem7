const API_BASE_URL = 'http://127.0.0.1:8000';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function getAppointmentStats() {
  return requestJson(`${API_BASE_URL}/api/appointments/stats`);
}

export async function getHealthStatus() {
  return requestJson(`${API_BASE_URL}/api/health`);
}

export async function getDoctorSchedule(doctorId) {
  return requestJson(`${API_BASE_URL}/api/doctors/${doctorId}/schedule`);
}

export async function getDoctorAvailability(doctorId, { startDate, days = 7 } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (days) params.append('days', String(days));
  return requestJson(
    `${API_BASE_URL}/api/doctors/${doctorId}/availability?${params.toString()}`
  );
}

export async function getDoctorSlots(doctorId, date) {
  const params = new URLSearchParams({ date });
  return requestJson(
    `${API_BASE_URL}/api/doctors/${doctorId}/slots?${params.toString()}`
  );
}

export async function getAppointments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.doctorId) params.append('doctor_id', String(filters.doctorId));
  if (filters.source) params.append('source', filters.source);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  return requestJson(`${API_BASE_URL}/api/appointments?${params.toString()}`);
}

export async function bookAppointment(payload) {
  return requestJson(`${API_BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function cancelAppointment(appointmentId) {
  return requestJson(`${API_BASE_URL}/api/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
  });
}

export async function rescheduleAppointment(appointmentId, payload) {
  return requestJson(`${API_BASE_URL}/api/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
