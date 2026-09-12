// ==========================================================
// Pulse Dial: Firebase & Global Cloud Sync Configuration
// Conforms to Section 2 & 8: Hospital RBAC & Real-Time Sync
// ==========================================================

export const PRECONFIGURED_HOSPITALS = [
  {
    id: 'h1111111-1111-1111-1111-111111111111',
    name: 'Apollo Trauma Center & Regional Blood Bank',
    license_number: 'MED-REG-TRAUMA-9942',
    email: 'apollo.admin@apollohealth.org',
    password: 'ApolloTrauma@2026',
    phone: '+91-9876543210',
    lat: 10.5276,
    lon: 76.2144,
    district: 'Central Trauma District',
    blood_bank_incharge: 'Dr. Ramesh Menon, MD Transfusion',
  },
  {
    id: 'h2222222-2222-2222-2222-222222222222',
    name: 'Metropolitan Memorial Hospital',
    license_number: 'MED-REG-METRO-4421',
    email: 'metro.blood@metrohealth.org',
    password: 'MetroBlood@2026',
    phone: '+91-9876543211',
    lat: 10.5385,
    lon: 76.2250,
    district: 'North Metro Region',
    blood_bank_incharge: 'Dr. Preethi Nair, Head of Pathology',
  },
  {
    id: 'h3333333-3333-3333-3333-333333333333',
    name: 'City Emergency General Hospital',
    license_number: 'MED-REG-CITY-1088',
    email: 'city.general@cityhealth.org',
    password: 'CityGen@2026',
    phone: '+91-9876543212',
    lat: 10.5150,
    lon: 76.2050,
    district: 'South Central Zone',
    blood_bank_incharge: 'Dr. K. George, Trauma Director',
  },
];

// Firebase Project Credentials
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA_PulseDial_MockApiKey2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pulse-dial-emergency.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pulse-dial-emergency',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pulse-dial-emergency.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '891230491023',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:891230491023:web:a1b2c3d4e5f6',
};

/**
 * Authenticates Hospital Staff using pre-provisioned database records.
 * Per specification, no public account creation is permitted for hospitals.
 */
export async function authenticateHospitalStaff(identifier, password) {
  // First attempt backend validation
  try {
    const res = await fetch('/api/auth/hospital-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, hospital: data.hospital, token: data.token };
    }
  } catch (err) {
    // If running in standalone Vercel preview without local Node backend
  }

  // Fallback to pre-configured hospital database list
  const match = PRECONFIGURED_HOSPITALS.find(
    (h) =>
      (h.email.toLowerCase() === identifier.toLowerCase() ||
        h.license_number.toLowerCase() === identifier.toLowerCase()) &&
      h.password === password
  );

  if (match) {
    const token = `hosp_token_${btoa(match.id + ':' + Date.now())}`;
    return {
      success: true,
      hospital: match,
      token,
    };
  }

  return {
    success: false,
    error: 'Access Denied: Unrecognized hospital credentials or unverified medical license.',
  };
}
