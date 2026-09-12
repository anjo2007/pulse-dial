// ==========================================================
// Pulse Dial: Automated Firebase Firestore Database Seeder
// Seeds Hospitals & Donor Medical Records into Firestore
// ==========================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedFirestore() {
  console.log('\n============================================================');
  console.log('🔥 PULSE DIAL: FIREBASE FIRESTORE SEEDER');
  console.log('============================================================\n');

  const seedPath = path.resolve(__dirname, '../database/seed.json');
  if (!fs.existsSync(seedPath)) {
    console.error('❌ seed.json not found at ' + seedPath);
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  console.log(`📁 Loaded ${seedData.hospitals.length} hospitals and ${seedData.donors.length} citizen donors.`);

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.log('\n⚠️  No FIREBASE_PROJECT_ID found in environment.');
    console.log('To push directly to real Firebase Firestore, run:');
    console.log('  $env:FIREBASE_PROJECT_ID="your-project-id"');
    console.log('  node scripts/seedFirebase.js\n');
    console.log('✅ Local database seed.json is ready and formatted for 1-click import into Firestore!');
    return;
  }

  console.log(`🌐 Connecting to Firestore Project: ${projectId}...`);

  // Firestore REST API Endpoint
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  // Seed Hospitals
  for (const h of seedData.hospitals) {
    const docUrl = `${baseUrl}/hospitals/${h.id}`;
    const fields = {
      name: { stringValue: h.name },
      license_number: { stringValue: h.license_number },
      email: { stringValue: h.email },
      password: { stringValue: h.password },
      phone: { stringValue: h.phone },
      lat: { doubleValue: h.lat },
      lon: { doubleValue: h.lon },
      district: { stringValue: h.district },
      blood_bank_incharge: { stringValue: h.blood_bank_incharge },
      is_verified: { booleanValue: true },
    };

    try {
      const res = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (res.ok) {
        console.log(`  🏥 Seeded Hospital: ${h.name}`);
      } else {
        const err = await res.text();
        console.warn(`  ⚠️ Could not seed hospital ${h.name}: ${err}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Network error seeding ${h.name}: ${e.message}`);
    }
  }

  // Seed Donors
  for (const d of seedData.donors) {
    const docUrl = `${baseUrl}/donors/${d.id}`;
    const fields = {
      full_name: { stringValue: d.full_name },
      phone: { stringValue: d.phone },
      email: { stringValue: d.email },
      blood_type: { stringValue: d.blood_type },
      age: { integerValue: String(d.age) },
      weight_kg: { integerValue: String(d.weight_kg) },
      last_donation_date: { stringValue: d.last_donation_date || 'Never' },
      medications: { stringValue: d.medications },
      diseases: { stringValue: d.diseases },
      reliability_score: { integerValue: String(d.reliability_score) },
      is_available: { booleanValue: d.is_available },
      lat: { doubleValue: d.lat },
      lon: { doubleValue: d.lon },
    };

    try {
      const res = await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (res.ok) {
        console.log(`  🩸 Seeded Donor: ${d.full_name} (${d.blood_type})`);
      }
    } catch (e) {}
  }

  console.log('\n🎉 Firestore Seeding Complete!');
}

seedFirestore();
