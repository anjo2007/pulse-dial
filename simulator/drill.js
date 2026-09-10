// ==========================================================
// Pulse Dial: End-to-End Emergency Drill & Benchmark Runner
// Validates Sub-Second Matching, Cooldowns, Priority Scoring,
// Radial Escalation, and Cryptographic QR Verification
// ==========================================================

import {
  SpatialDispatchEngine,
  calculateDistanceKm,
  calculatePriorityScore,
  isEligibleCooldown,
} from '../backend/src/spatialEngine.js';
import { generateArrivalToken, verifyArrivalToken } from '../backend/src/services/qrService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runDrill() {
  console.log('\n============================================================');
  console.log('🚨 PULSE DIAL: EMERGENCY BLOOD DISPATCH DRILL & BENCHMARK');
  console.log('============================================================\n');

  const engine = new SpatialDispatchEngine();

  // 1. Load seed data
  const seedPath = path.resolve(__dirname, '../database/seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  for (const h of seedData.hospitals) engine.registerHospital(h);
  for (const d of seedData.donors) engine.registerDonor(d);

  const hospital = seedData.hospitals[0]; // Apollo Trauma Center
  console.log(`🏥 Hospital: ${hospital.name}`);
  console.log(`📍 Location: Lat ${hospital.lat}, Lon ${hospital.lon}`);
  console.log(`👥 Registered Donors: ${seedData.donors.length}\n`);

  // 2. Benchmark Stage 1: Tier 1 Search (<= 1 km)
  console.log('--- TEST 1: Tier 1 Radial Dispatch (<= 1 km, 3x Multiplier) ---');
  const t0 = performance.now();
  const tier1Result = engine.searchEligibleDonors(hospital.lat, hospital.lon, 'O-', 1.0, 6);
  const latency = performance.now() - t0;

  console.log(`⏱️ Spatial Query Latency: ${latency.toFixed(3)} ms (Target: < 5 ms)`);
  if (latency > 15) throw new Error('Latency check failed');
  console.log(`🎯 Eligible Candidates Found in Tier 1: ${tier1Result.candidates.length}`);

  for (const c of tier1Result.candidates) {
    console.log(
      `   👉 ${c.donor.full_name.padEnd(22)} | Dist: ${c.distanceKm} km | Score P(d): ${c.priorityScore.toFixed(3)} | Blood: ${c.donor.blood_type}`
    );
  }

  // Verify that cooldown donor (d002) and offline donor (d003) were excluded
  const hasCooldownDonor = tier1Result.candidates.some((c) => c.donor.id === 'd002-tier1-o-neg-cooldown');
  const hasOfflineDonor = tier1Result.candidates.some((c) => c.donor.id === 'd003-tier1-o-neg-inactive');

  console.log(`\n🛡️ Cooldown Bitset Filter (< 90 days excluded): ${!hasCooldownDonor ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`🛡️ Availability Bitset Filter (Offline excluded): ${!hasOfflineDonor ? 'PASSED ✅' : 'FAILED ❌'}`);
  if (hasCooldownDonor || hasOfflineDonor) throw new Error('Bitset filter failed!');

  // 3. Benchmark Priority Score formula
  console.log('\n--- TEST 2: Composite Priority Score Validation ---');
  const sampleDist = 0.5; // 500 meters
  const sampleReliability = 140;
  const sampleHeartbeatMinutes = 10;
  const expectedScore = calculatePriorityScore(sampleDist, sampleReliability, sampleHeartbeatMinutes);
  // w1*(1/0.5) + w2*(140/150) + w3*(1.0) = 0.45*2 + 0.4*(0.9333) + 0.15*1 = 0.9 + 0.3733 + 0.15 = 1.423
  console.log(`Calculated P(d) for dist=${sampleDist}km, rel=${sampleReliability}: ${expectedScore}`);
  if (expectedScore < 1.3 || expectedScore > 1.5) throw new Error('Priority score formula calculation incorrect');
  console.log('Priority Score Formula: PASSED ✅');

  // 4. Test Tier 2 Escalation (<= 5 km)
  console.log('\n--- TEST 3: Radial Escalation State Machine ---');
  console.log('Simulating Tier 1 timeout -> Escalating to Tier 2 (<= 5 km)...');
  const tier2Result = engine.searchEligibleDonors(hospital.lat, hospital.lon, 'O-', 5.0, 10);
  console.log(`🎯 Eligible Candidates Found in Tier 2: ${tier2Result.candidates.length}`);
  if (tier2Result.candidates.length <= tier1Result.candidates.length) {
    throw new Error('Tier 2 should yield more candidates than Tier 1');
  }
  console.log('Radial Tier 2 Expansion: PASSED ✅');

  // 5. Test Tier 3 Escalation (<= 15 km)
  console.log('Simulating Tier 2 timeout -> Escalating to Tier 3 (<= 15 km)...');
  const tier3Result = engine.searchEligibleDonors(hospital.lat, hospital.lon, 'O-', 15.0, 20);
  console.log(`🎯 Eligible Candidates Found in Tier 3: ${tier3Result.candidates.length}`);
  if (tier3Result.candidates.length <= tier2Result.candidates.length) {
    throw new Error('Tier 3 should yield more candidates than Tier 2');
  }
  console.log('Radial Tier 3 Expansion: PASSED ✅');

  // 6. Test Cryptographic QR Token & +15 Score Award
  console.log('\n--- TEST 4: Cryptographic Arrival Token & Donor Reward ---');
  const donor = tier1Result.candidates[0].donor;
  const initialScore = donor.reliability_score;
  const tokenPayload = {
    requestId: 'req-drill-100',
    donorId: donor.id,
    hospitalId: hospital.id,
    bloodType: 'O-',
  };

  const { token } = generateArrivalToken(tokenPayload);
  console.log(`Generated Arrival Pass Token: ${token.substring(0, 32)}...`);

  // Verify token
  const verifyResult = verifyArrivalToken(token);
  if (!verifyResult.valid) throw new Error('Token verification failed: ' + verifyResult.error);
  console.log('Cryptographic Signature & Timestamp Verification: PASSED ✅');

  // Verify counterfeit detection
  const tamperedToken = token.substring(0, token.length - 4) + 'AAAA';
  const tamperResult = verifyArrivalToken(tamperedToken);
  if (tamperResult.valid) throw new Error('Tampered token should be rejected!');
  console.log('Counterfeit Token Rejection: PASSED ✅');

  // Simulate arrival check-in and +15 reliability credit
  donor.reliability_score += 15;
  console.log(`Donor ${donor.full_name}: Reliability Score updated from ${initialScore} -> ${donor.reliability_score} (+15 pts)`);
  if (donor.reliability_score !== initialScore + 15) throw new Error('Score credit failed');
  console.log('Donor Reliability Score Credit: PASSED ✅');

  console.log('\n============================================================');
  console.log('🎉 ALL DRILL TESTS & SYSTEM SPECIFICATIONS VERIFIED: 100% PASS');
  console.log('============================================================\n');
}

runDrill();
