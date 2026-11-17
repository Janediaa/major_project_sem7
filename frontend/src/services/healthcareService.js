const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://healthcare-navigator-api-phi.vercel.app');

// Verified testing clinician & clinic profiles interconnected between Patient and Doctor portals
export const VERIFIED_TESTING_DOCTOR = {
  doctor_id: 'doc-ananya-rao',
  doctor_name: 'Dr. Ananya Rao',
  doctor_type: 'Pulmonology',
  specialization: 'Pulmonology',
  experience_years: 14,
  fees: 800,
  city: 'Delhi',
  location: 'Connaught Place',
  hospital_id: 'hosp-sunrise-chest',
  hospital_name: 'Sunrise Chest & Allergy Clinic',
  phone: '+91 90000 00000',
  email: 'doctor@healthnavigator.ai',
  rating: 4.8,
  reviews: 240,
  availableToday: true,
};

export const VERIFIED_TESTING_HOSPITAL = {
  hospital_id: 'hosp-sunrise-chest',
  hospital_name: 'Sunrise Chest & Allergy Clinic',
  city: 'Delhi',
  location: 'Connaught Place',
  address: 'Block B, Inner Circle, Connaught Place, New Delhi',
  type: 'Super Specialty Clinic',
  phone: '+91 11 4567 8900',
};

// Cache previously fetched data
let doctorsCache = null;
let hospitalsCache = null;

async function fetchData(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.trim().startsWith('<')) {
      throw new Error('Server returned HTML response instead of JSON. Check backend API URL.');
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON received from server.');
    }
  }

  if (!response.ok) {
    throw new Error('Unable to fetch healthcare data.');
  }

  return response.json();
}

function doctorMatchesFilter(doc, filters = {}) {
  if (filters.city && String(doc.city || '').toLowerCase() !== String(filters.city).toLowerCase()) {
    return false;
  }
  if (
    filters.specialization &&
    !String(doc.doctor_type || doc.specialization || '')
      .toLowerCase()
      .includes(String(filters.specialization).toLowerCase())
  ) {
    return false;
  }
  if (filters.search) {
    const s = String(filters.search).toLowerCase();
    const matchesName = String(doc.doctor_name || '').toLowerCase().includes(s);
    const matchesSpec = String(doc.doctor_type || doc.specialization || '').toLowerCase().includes(s);
    const matchesHosp = String(doc.hospital_name || '').toLowerCase().includes(s);
    const matchesCity = String(doc.city || '').toLowerCase().includes(s);
    if (!matchesName && !matchesSpec && !matchesHosp && !matchesCity) return false;
  }
  return true;
}

function hospitalMatchesFilter(hosp, filters = {}) {
  if (filters.city && String(hosp.city || '').toLowerCase() !== String(filters.city).toLowerCase()) {
    return false;
  }
  if (filters.search) {
    const s = String(filters.search).toLowerCase();
    const matchesName = String(hosp.hospital_name || '').toLowerCase().includes(s);
    const matchesCity = String(hosp.city || '').toLowerCase().includes(s);
    if (!matchesName && !matchesCity) return false;
  }
  return true;
}

export async function getDoctors(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.append('city', filters.city);
  if (filters.specialization) params.append('specialization', filters.specialization);
  if (filters.search) params.append('search', filters.search);

  const isDefault = params.toString() === '';

  let apiDoctors = [];
  try {
    if (isDefault && doctorsCache) {
      apiDoctors = doctorsCache.doctors || [];
      fetchData(`${API_BASE_URL}/api/doctors`)
        .then((data) => {
          if (data && data.doctors) doctorsCache = data;
        })
        .catch(() => {});
    } else {
      const data = await fetchData(`${API_BASE_URL}/api/doctors?${params.toString()}`);
      apiDoctors = data.doctors || [];
      if (isDefault) doctorsCache = data;
    }
  } catch (err) {
    console.info('Backend doctors fetch degraded, using baseline verified directory:', err.message);
  }

  // Prepend verified testing doctor Dr. Ananya Rao if it matches filters
  const merged = [];
  if (doctorMatchesFilter(VERIFIED_TESTING_DOCTOR, filters)) {
    merged.push(VERIFIED_TESTING_DOCTOR);
  }

  apiDoctors.forEach((doc) => {
    if (
      String(doc.doctor_id) !== String(VERIFIED_TESTING_DOCTOR.doctor_id) &&
      !String(doc.doctor_name || '').toLowerCase().includes('ananya rao')
    ) {
      merged.push(doc);
    }
  });

  return {
    total: merged.length,
    doctors: merged,
  };
}

export async function getHospitals(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.append('city', filters.city);
  if (filters.search) params.append('search', filters.search);

  const isDefault = params.toString() === '';

  let apiHospitals = [];
  try {
    if (isDefault && hospitalsCache) {
      apiHospitals = hospitalsCache.hospitals || [];
      fetchData(`${API_BASE_URL}/api/hospitals`)
        .then((data) => {
          if (data && data.hospitals) hospitalsCache = data;
        })
        .catch(() => {});
    } else {
      const data = await fetchData(`${API_BASE_URL}/api/hospitals?${params.toString()}`);
      apiHospitals = data.hospitals || [];
      if (isDefault) hospitalsCache = data;
    }
  } catch (err) {
    console.info('Backend hospitals fetch degraded, using baseline verified directory:', err.message);
  }

  // Prepend verified testing hospital if matches filter
  const merged = [];
  if (hospitalMatchesFilter(VERIFIED_TESTING_HOSPITAL, filters)) {
    merged.push(VERIFIED_TESTING_HOSPITAL);
  }

  apiHospitals.forEach((hosp) => {
    if (
      String(hosp.hospital_id) !== String(VERIFIED_TESTING_HOSPITAL.hospital_id) &&
      !String(hosp.hospital_name || '').toLowerCase().includes('sunrise chest')
    ) {
      merged.push(hosp);
    }
  });

  return {
    total: merged.length,
    hospitals: merged,
  };
}

export async function getHospitalDoctors(hospitalId) {
  return fetchData(
    `${API_BASE_URL}/api/hospitals/${hospitalId}/doctors`
  );
}
