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

export function getCustomDoctors() {
  const list = [];
  const seenIds = new Set();

  try {
    const raw = localStorage.getItem('hn_custom_doctors');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((d) => {
          if (d && d.doctor_id && !seenIds.has(String(d.doctor_id))) {
            seenIds.add(String(d.doctor_id));
            list.push(d);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to parse custom doctors:', err);
  }

  // Also check registered users where role is doctor
  try {
    const rawUsers = localStorage.getItem('hn_registered_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        users.forEach((u) => {
          if (u.role === 'doctor' && u.name) {
            const docId = u.id || `doc-${u.email}`;
            if (!seenIds.has(String(docId))) {
              seenIds.add(String(docId));
              list.push({
                doctor_id: docId,
                doctor_name: u.name.startsWith('Dr.') ? u.name : `Dr. ${u.name}`,
                doctor_type: u.specialization || 'General Medicine',
                specialization: u.specialization || 'General Medicine',
                experience_years: u.experienceYears || 10,
                fees: u.fee || u.fees || 750,
                city: u.city || u.location || 'Delhi',
                location: u.location || u.city || 'Central City Clinic',
                hospital_id: u.hospitalId || `hosp-${(u.hospital || 'Metro Care').toLowerCase().replace(/\s+/g, '-')}`,
                hospital_name: u.hospital || 'Metro Care Super Specialty Clinic',
                phone: u.phone || '+91 98765 43210',
                email: u.email,
                rating: 4.8,
                reviews: 48,
                availableToday: true,
                isRegistered: true,
              });
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to parse registered doctor users:', err);
  }

  return list;
}

export function saveCustomDoctor(doc) {
  try {
    const current = getCustomDoctors();
    const docId = doc.doctor_id || `doc-${doc.email ? doc.email.replace(/[@.]/g, '_') : Date.now()}`;
    const formatted = {
      doctor_id: docId,
      doctor_name: doc.doctor_name || (doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name || 'Specialist'}`),
      doctor_type: doc.doctor_type || doc.specialization || 'General Medicine',
      specialization: doc.specialization || doc.doctor_type || 'General Medicine',
      experience_years: doc.experience_years || doc.experienceYears || 10,
      fees: doc.fees != null ? Number(doc.fees) : doc.fee != null ? Number(doc.fee) : 750,
      city: doc.city || doc.location || 'Delhi',
      location: doc.location || doc.city || 'Connaught Place',
      hospital_id: doc.hospital_id || doc.hospitalId || `hosp-${(doc.hospital_name || doc.hospital || 'Metro Care').toLowerCase().replace(/\s+/g, '-')}`,
      hospital_name: doc.hospital_name || doc.hospital || 'Metro Care Super Specialty Clinic',
      phone: doc.phone || '+91 98765 43210',
      email: doc.email || '',
      rating: doc.rating || 4.9,
      reviews: doc.reviews || 64,
      availableToday: true,
      isRegistered: true,
    };

    const filtered = current.filter((d) => String(d.doctor_id) !== String(docId) && (!doc.email || d.email !== doc.email));
    const updated = [formatted, ...filtered];
    localStorage.setItem('hn_custom_doctors', JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hn_doctors_updated', { detail: formatted }));
    }

    return formatted;
  } catch (err) {
    console.warn('Failed to save custom doctor:', err);
    return doc;
  }
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
  const seenIds = new Set();

  if (doctorMatchesFilter(VERIFIED_TESTING_DOCTOR, filters)) {
    merged.push(VERIFIED_TESTING_DOCTOR);
    seenIds.add(String(VERIFIED_TESTING_DOCTOR.doctor_id));
  }

  // Prepend any newly registered / custom doctors
  const customDocs = getCustomDoctors();
  customDocs.forEach((doc) => {
    if (!seenIds.has(String(doc.doctor_id)) && doctorMatchesFilter(doc, filters)) {
      merged.push(doc);
      seenIds.add(String(doc.doctor_id));
    }
  });

  apiDoctors.forEach((doc) => {
    if (
      !seenIds.has(String(doc.doctor_id)) &&
      !String(doc.doctor_name || '').toLowerCase().includes('ananya rao')
    ) {
      merged.push(doc);
      seenIds.add(String(doc.doctor_id));
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
  const seenHospIds = new Set();

  if (hospitalMatchesFilter(VERIFIED_TESTING_HOSPITAL, filters)) {
    merged.push(VERIFIED_TESTING_HOSPITAL);
    seenHospIds.add(String(VERIFIED_TESTING_HOSPITAL.hospital_id));
  }

  // Add hospitals from custom registered doctors
  const customDocs = getCustomDoctors();
  customDocs.forEach((doc) => {
    if (doc.hospital_id && doc.hospital_name && !seenHospIds.has(String(doc.hospital_id))) {
      const customHosp = {
        hospital_id: doc.hospital_id,
        hospital_name: doc.hospital_name,
        city: doc.city || 'Delhi',
        location: doc.location || doc.city || 'City Center',
        address: `${doc.hospital_name}, ${doc.city || 'Delhi'}`,
        phone: doc.phone || '+91 98765 43210',
      };
      if (hospitalMatchesFilter(customHosp, filters)) {
        merged.push(customHosp);
        seenHospIds.add(String(doc.hospital_id));
      }
    }
  });

  apiHospitals.forEach((hosp) => {
    if (
      !seenHospIds.has(String(hosp.hospital_id)) &&
      !String(hosp.hospital_name || '').toLowerCase().includes('sunrise chest')
    ) {
      merged.push(hosp);
      seenHospIds.add(String(hosp.hospital_id));
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
