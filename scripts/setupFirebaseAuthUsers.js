// ==========================================================
// Pulse Dial: Automated Firebase Authentication Setup Script
// Provisions Hospital Staff Accounts in Firebase Auth & Firestore
// ==========================================================

import fs from 'fs';
import path from 'path';

const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
let token = null;
if (fs.existsSync(configPath)) {
  const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  token = data.tokens?.access_token;
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'pulse-dial-emergency';
let apiKey = process.env.VITE_FIREBASE_API_KEY;
if (!apiKey) {
  const envPath = path.resolve(process.cwd(), 'frontend', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_FIREBASE_API_KEY=([^\r\n]+)/);
    if (match) apiKey = match[1].trim();
  }
}

const HOSPITAL_ACCOUNTS = [
  {
    email: 'apollo.admin@apollohealth.org',
    password: 'ApolloTrauma@2026',
    displayName: 'Apollo Trauma Center Staff Admin',
    hospitalId: 'h1111111-1111-1111-1111-111111111111',
  },
  {
    email: 'metro.blood@metrohealth.org',
    password: 'MetroBlood@2026',
    displayName: 'Metropolitan Memorial Blood Bank Admin',
    hospitalId: 'h2222222-2222-2222-2222-222222222222',
  },
  {
    email: 'city.general@cityhealth.org',
    password: 'CityGen@2026',
    displayName: 'City Emergency General Admin',
    hospitalId: 'h3333333-3333-3333-3333-333333333333',
  },
];

async function setupUsers() {
  console.log('============================================================');
  console.log('🔥 PULSE DIAL: FIREBASE AUTHENTICATION USER PROVISIONER');
  console.log(`Target Project: ${projectId}`);
  console.log('============================================================\n');

  for (const acc of HOSPITAL_ACCOUNTS) {
    console.log(`👉 Provisioning hospital account: ${acc.email}...`);

    // 1. Try public signUp endpoint
    try {
      const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
      const res = await fetch(signUpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: acc.email,
          password: acc.password,
          displayName: acc.displayName,
          returnSecureToken: true,
        }),
      });

      const body = await res.json();
      if (res.ok) {
        console.log(`  ✅ Successfully registered in Firebase Auth! UID: ${body.localId}`);
      } else if (body.error?.message?.includes('EMAIL_EXISTS')) {
        console.log(`  ℹ️  Account already exists in Firebase Auth.`);
      } else {
        console.log(`  ⚠️ Firebase Auth API response: ${body.error?.message || JSON.stringify(body)}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Network error calling Auth API: ${err.message}`);
    }

    // 2. Ensure Firestore record is updated with verified status
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/hospitals/${acc.hospitalId}?updateMask.fieldPaths=email&updateMask.fieldPaths=password&updateMask.fieldPaths=is_verified`;
      const updateRes = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            email: { stringValue: acc.email },
            password: { stringValue: acc.password },
            is_verified: { booleanValue: true },
          },
        }),
      });
      if (updateRes.ok) {
        console.log(`  ✅ Synced Firestore credentials record for ${acc.displayName}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Firestore sync error: ${e.message}`);
    }
  }

  console.log('\n🎉 Setup sequence complete!');
}

setupUsers();
