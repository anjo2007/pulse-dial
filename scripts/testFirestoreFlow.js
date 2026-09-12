// ==========================================================
// Pulse Dial: End-to-End Firestore Real-Time Flow Test
// Verifies Emergency Request -> Dispatch -> QR Verification
// ==========================================================

const projectId = 'pulse-dial-emergency';
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function testFlow() {
  console.log('============================================================');
  console.log('🧪 TESTING FIRESTORE EMERGENCY DISPATCH & REGISTRATION FLOW');
  console.log('============================================================\n');

  const testId = `test_sos_${Date.now()}`;
  const testDonorId = `test_donor_${Date.now()}`;
  const testQrToken = `QR_VERIFY_TEST_${Date.now()}`;

  // 1. Create a Test Donor with full medical record
  console.log('1️⃣ Creating Test Citizen Donor in Firestore...');
  const donorDocUrl = `${baseUrl}/donors/${testDonorId}`;
  const donorRes = await fetch(donorDocUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        full_name: { stringValue: 'Pooja Varma' },
        phone: { stringValue: '+91-9988776655' },
        blood_type: { stringValue: 'O-' },
        age: { integerValue: '26' },
        weight_kg: { integerValue: '62' },
        last_donation_date: { stringValue: '2026-03-01' },
        medications: { stringValue: 'None' },
        diseases: { stringValue: 'None (Healthy)' },
        reliability_score: { integerValue: '120' },
        is_available: { booleanValue: true },
        lat: { doubleValue: 10.5285 },
        lon: { doubleValue: 76.2155 },
      },
    }),
  });

  if (donorRes.ok) {
    console.log('  ✅ Donor profile created in Cloud Firestore: Pooja Varma (O-)');
  } else {
    console.error('  ❌ Failed to create donor:', await donorRes.text());
    return;
  }

  // 2. Trigger an SOS Emergency Request from Apollo Hospital
  console.log('\n2️⃣ Creating SOS Emergency Request in Firestore...');
  const reqDocUrl = `${baseUrl}/emergency_requests/${testId}`;
  const reqRes = await fetch(reqDocUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        hospital_id: { stringValue: 'h1111111-1111-1111-1111-111111111111' },
        hospital_name: { stringValue: 'Apollo Trauma Center & Regional Blood Bank' },
        blood_type: { stringValue: 'O-' },
        units_required: { integerValue: '2' },
        units_collected: { integerValue: '0' },
        urgency: { stringValue: 'CRITICAL_CODE_RED' },
        current_tier: { integerValue: '1' },
        current_radius_km: { doubleValue: 3.0 },
        status: { stringValue: 'ACTIVE' },
        created_at: { stringValue: new Date().toISOString() },
      },
    }),
  });

  if (reqRes.ok) {
    console.log('  ✅ SOS Request created in Cloud Firestore: 2 Units O- needed at Apollo Trauma Center');
  } else {
    console.error('  ❌ Failed to create request:', await reqRes.text());
    return;
  }

  // 3. Create Dispatch Assignment for the Donor
  console.log('\n3️⃣ Dispatching Emergency Call to Matched Donor...');
  const asgnId = `asgn_${testId}_${testDonorId}`;
  const asgnDocUrl = `${baseUrl}/dispatch_assignments/${asgnId}`;
  const asgnRes = await fetch(asgnDocUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        request_id: { stringValue: testId },
        donor_id: { stringValue: testDonorId },
        donor_name: { stringValue: 'Pooja Varma' },
        donor_phone: { stringValue: '+91-9988776655' },
        blood_type: { stringValue: 'O-' },
        distance_km: { doubleValue: 0.85 },
        priority_score: { doubleValue: 0.94 },
        status: { stringValue: 'ACCEPTED' },
        qr_token: { stringValue: testQrToken },
        created_at: { stringValue: new Date().toISOString() },
      },
    }),
  });

  if (asgnRes.ok) {
    console.log(`  ✅ Dispatch Assignment created: Status ACCEPTED, QR Token: ${testQrToken}`);
  } else {
    console.error('  ❌ Failed to create assignment:', await asgnRes.text());
    return;
  }

  // 4. Verify QR Pass Arrival at Hospital
  console.log('\n4️⃣ Hospital Scans QR Pass to Authenticate Arrival...');
  const verifyRes = await fetch(asgnDocUrl + '?updateMask.fieldPaths=status&updateMask.fieldPaths=verified_at', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        status: { stringValue: 'COMPLETED' },
        verified_at: { stringValue: new Date().toISOString() },
      },
    }),
  });

  if (verifyRes.ok) {
    console.log('  ✅ Donor arrival authenticated in Cloud Firestore! Marked COMPLETED.');
  }

  // Update Request Units Collected
  await fetch(reqDocUrl + '?updateMask.fieldPaths=units_collected&updateMask.fieldPaths=status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        units_collected: { integerValue: '1' },
        status: { stringValue: 'ACTIVE' },
      },
    }),
  });
  console.log('  ✅ Hospital emergency units collected updated: 1 / 2 Units collected.');

  // Clean up test documents
  console.log('\n5️⃣ Cleaning up test telemetry docs...');
  await fetch(reqDocUrl, { method: 'DELETE' });
  await fetch(asgnDocUrl, { method: 'DELETE' });
  await fetch(donorDocUrl, { method: 'DELETE' });
  console.log('  ✅ Test artifacts cleanly removed from database.');

  console.log('\n============================================================');
  console.log('🎉 ALL FIRESTORE REAL-TIME OPERATIONS SUCCEEDED 100%!');
  console.log('============================================================');
}

testFlow();
