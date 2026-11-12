const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

// Cache previously fetched data
let doctorsCache = null;
let hospitalsCache = null;

async function fetchData(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Unable to fetch healthcare data.');
  }

  return response.json();
}

export async function getDoctors(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.append('city', filters.city);
  if (filters.specialization) params.append('specialization', filters.specialization);
  if (filters.search) params.append('search', filters.search);

  const isDefault = params.toString() === '';

  if (isDefault && doctorsCache) {
    // Return cached data immediately and refresh in background
    fetchData(`${API_BASE_URL}/api/doctors`)
      .then(data => { doctorsCache = data; })
      .catch(() => {});

    return doctorsCache;
  }

  const data = await fetchData(
    `${API_BASE_URL}/api/doctors?${params.toString()}`
  );

  if (isDefault) doctorsCache = data;

  return data;
}

export async function getHospitals(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.append('city', filters.city);
  if (filters.search) params.append('search', filters.search);

  const isDefault = params.toString() === '';

  if (isDefault && hospitalsCache) {
    fetchData(`${API_BASE_URL}/api/hospitals`)
      .then(data => { hospitalsCache = data; })
      .catch(() => {});

    return hospitalsCache;
  }

  const data = await fetchData(
    `${API_BASE_URL}/api/hospitals?${params.toString()}`
  );

  if (isDefault) hospitalsCache = data;

  return data;
}

export async function getHospitalDoctors(hospitalId) {
  return fetchData(
    `${API_BASE_URL}/api/hospitals/${hospitalId}/doctors`
  );
}
