// ==========================================================
// Pulse Dial: Core Backend Microservice & WebSocket Server
// Conforms to Section 2, 3, 4, 5, 7 of Technical Specification
// ==========================================================

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  SpatialDispatchEngine,
  calculateDistanceKm,
  getRemainingCooldownDays,
  isEligibleCooldown,
} from './spatialEngine.js';
import { generateArrivalToken, verifyArrivalToken } from './services/qrService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize Spatial Engine
const engine = new SpatialDispatchEngine();

// Load initial seed data
const seedPath = path.resolve(__dirname, '../../database/seed.json');
function loadSeedData() {
  if (fs.existsSync(seedPath)) {
    const raw = fs.readFileSync(seedPath, 'utf-8');
    const data = JSON.parse(raw);
    for (const h of data.hospitals) {
      engine.registerHospital(h);
    }
    for (const d of data.donors) {
      engine.registerDonor(d);
    }
    console.log(`[Engine] Initialized with ${data.hospitals.length} hospitals and ${data.donors.length} donors.`);
  }
}
loadSeedData();

// WebSocket Connection & Broadcast Management
const connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Pulse Dial Real-Time Stream Connected' }));

  ws.on('message', (msgStr) => {
    try {
      const msg = JSON.parse(msgStr);
      if (msg.type === 'IDENTIFY') {
        ws.clientRole = msg.role; // 'HOSPITAL' | 'DONOR'
        ws.clientId = msg.id;
      }
    } catch (e) {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
  });
});

function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ==========================================================
// REST API ROUTES
// ==========================================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    hospitalsCount: engine.hospitals.size,
    donorsCount: engine.donors.size,
    activeRequestsCount: engine.activeRequests.size,
  });
});

// Hospital Login (Manual pre-configured accounts ONLY - no public signup)
app.post('/api/auth/hospital-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const hospitalsList = Array.from(engine.hospitals.values());
  const hospital = hospitalsList.find(
    (h) => (h.email.toLowerCase() === email.toLowerCase() || h.license_number.toLowerCase() === email.toLowerCase()) && h.password === password
  );

  if (!hospital) {
    return res.status(401).json({
      error: 'Invalid credentials. Only pre-verified hospital accounts provisioned by State Health Authorities may log in.',
    });
  }

  res.json({
    success: true,
    message: 'Authentication successful',
    hospital: {
      id: hospital.id,
      name: hospital.name,
      license_number: hospital.license_number,
      email: hospital.email,
      phone: hospital.phone,
      lat: hospital.lat,
      lon: hospital.lon,
      district: hospital.district,
      blood_bank_incharge: hospital.blood_bank_incharge,
    },
    token: `hosp_jwt_${Buffer.from(hospital.id + ':' + Date.now()).toString('base64')}`,
  });
});

// Citizen Donor Registration
app.post('/api/donors/register', (req, res) => {
  const {
    full_name,
    phone,
    email,
    password,
    blood_type,
    age,
    weight_kg,
    last_donation_date,
    medications = 'None',
    diseases = 'None',
    lat = 10.5280,
    lon = 76.2150,
  } = req.body;

  if (!full_name || !phone || !blood_type) {
    return res.status(400).json({ error: 'Full Name, Phone Number, and Blood Group are mandatory.' });
  }

  const donorId = `d_${uuidv4().substring(0, 8)}`;
  const newDonor = {
    id: donorId,
    full_name,
    phone,
    email: email || `${phone}@pulsedial.org`,
    password: password || 'donor123',
    blood_type,
    age: Number(age) || 25,
    weight_kg: Number(weight_kg) || 60,
    last_donation_date: last_donation_date || null,
    medications,
    diseases,
    lat: Number(lat),
    lon: Number(lon),
    reliability_score: 100, // starting base Karma score
    is_available: true,
    minutes_since_heartbeat: 0,
    created_at: new Date().toISOString(),
  };

  engine.registerDonor(newDonor);

  broadcast({
    type: 'DONOR_REGISTERED',
    donor: {
      id: newDonor.id,
      full_name: newDonor.full_name,
      blood_type: newDonor.blood_type,
      reliability_score: newDonor.reliability_score,
      is_available: newDonor.is_available,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Donor account created successfully',
    donor: newDonor,
  });
});

// Citizen Donor Login
app.post('/api/auth/donor-login', (req, res) => {
  const { identifier, password } = req.body;
  const donorsList = Array.from(engine.donors.values());
  const donor = donorsList.find(
    (d) => (d.phone === identifier || d.email === identifier) && (!password || d.password === password)
  );

  if (!donor) {
    return res.status(401).json({ error: 'Invalid phone/email or password' });
  }

  res.json({
    success: true,
    donor,
    token: `donor_jwt_${Buffer.from(donor.id + ':' + Date.now()).toString('base64')}`,
  });
});

// List all hospitals
app.get('/api/hospitals', (req, res) => {
  const list = Array.from(engine.hospitals.values()).map((h) => ({
    id: h.id,
    name: h.name,
    license_number: h.license_number,
    email: h.email,
    phone: h.phone,
    lat: h.lat,
    lon: h.lon,
    district: h.district,
    blood_bank_incharge: h.blood_bank_incharge,
  }));
  res.json(list);
});

// List all donors
app.get('/api/donors', (req, res) => {
  const donorsList = Array.from(engine.donors.values()).map((d) => ({
    id: d.id,
    full_name: d.full_name,
    phone: d.phone,
    blood_type: d.blood_type,
    age: d.age,
    weight_kg: d.weight_kg,
    medications: d.medications,
    diseases: d.diseases,
    reliability_score: d.reliability_score,
    is_available: d.is_available,
    last_donation_date: d.last_donation_date,
    remaining_cooldown_days: getRemainingCooldownDays(d.last_donation_date),
    is_eligible: isEligibleCooldown(d.last_donation_date),
    lat: d.lat,
    lon: d.lon,
  }));
  res.json(donorsList);
});

// Get single donor
app.get('/api/donors/:id', (req, res) => {
  const donor = engine.donors.get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  res.json({
    ...donor,
    remaining_cooldown_days: getRemainingCooldownDays(donor.last_donation_date),
    is_eligible: isEligibleCooldown(donor.last_donation_date),
  });
});

// Toggle donor availability
app.post('/api/donors/:id/toggle', (req, res) => {
  const donor = engine.donors.get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });

  donor.is_available = !donor.is_available;
  engine.registerDonor(donor);

  broadcast({
    type: 'DONOR_AVAILABILITY_CHANGED',
    donorId: donor.id,
    is_available: donor.is_available,
  });

  res.json({ id: donor.id, is_available: donor.is_available });
});

// Trigger SOS Emergency Dispatch
app.post('/api/emergency/request', (req, res) => {
  const { hospital_id, blood_type, units_needed = 1, urgency = 'URGENT' } = req.body;

  const hospital = engine.hospitals.get(hospital_id);
  if (!hospital) {
    return res.status(400).json({ error: 'Invalid hospital_id' });
  }

  const requestId = uuidv4();
  const tierConfig = engine.getTierConfig(1); // Start Tier 1: <= 1 km

  // Search candidates within Tier 1 radius
  const searchResult = engine.searchEligibleDonors(
    hospital.lat,
    hospital.lon,
    blood_type,
    tierConfig.radiusKm,
    units_needed * tierConfig.multiplier
  );

  const emergencyReq = {
    id: requestId,
    hospital_id,
    hospital_name: hospital.name,
    hospital_lat: hospital.lat,
    hospital_lon: hospital.lon,
    blood_type,
    units_needed: Number(units_needed),
    units_collected: 0,
    urgency,
    current_tier: 1,
    current_radius_km: tierConfig.radiusKm,
    status: 'DISPATCHING',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    query_latency_ms: searchResult.queryLatencyMs,
  };

  engine.activeRequests.set(requestId, emergencyReq);

  // Create assignments
  const assignments = [];
  for (const match of searchResult.candidates) {
    const assignment = {
      id: uuidv4(),
      request_id: requestId,
      donor_id: match.donor.id,
      donor_name: match.donor.full_name,
      donor_phone: match.donor.phone,
      donor_blood_type: match.donor.blood_type,
      lat: match.donor.lat,
      lon: match.donor.lon,
      tier_level: 1,
      status: 'PINGED',
      distance_km: match.distanceKm,
      distance_meters: match.distanceMeters,
      priority_score: match.priorityScore,
      notified_at: new Date().toISOString(),
    };
    assignments.push(assignment);
    engine.assignments.set(`${requestId}:${match.donor.id}`, assignment);
  }

  // Real-time broadcast
  broadcast({
    type: 'SOS_DISPATCH_TRIGGERED',
    request: emergencyReq,
    assignments,
    searchMetrics: {
      candidatesEvaluated: searchResult.totalMatches,
      dispatchedCount: assignments.length,
      latencyMs: searchResult.queryLatencyMs,
    },
  });

  res.status(201).json({
    request: emergencyReq,
    assignments,
    searchMetrics: {
      totalEligibleMatches: searchResult.totalMatches,
      dispatchedCount: assignments.length,
      latencyMs: searchResult.queryLatencyMs,
    },
  });
});

// Escalate request to next radial tier
app.post('/api/emergency/:id/escalate', (req, res) => {
  const { id } = req.params;
  const emergencyReq = engine.activeRequests.get(id);
  if (!emergencyReq) return res.status(404).json({ error: 'Request not found' });

  if (emergencyReq.current_tier >= 3) {
    return res.status(400).json({ error: 'Already at maximum radial tier (Tier 3 - 15 km)' });
  }

  emergencyReq.current_tier += 1;
  const tierConfig = engine.getTierConfig(emergencyReq.current_tier);
  emergencyReq.current_radius_km = tierConfig.radiusKm;

  // Search within new radius
  const hospital = engine.hospitals.get(emergencyReq.hospital_id);
  const searchResult = engine.searchEligibleDonors(
    hospital.lat,
    hospital.lon,
    emergencyReq.blood_type,
    tierConfig.radiusKm,
    emergencyReq.units_needed * tierConfig.multiplier * 2
  );

  const newAssignments = [];
  for (const match of searchResult.candidates) {
    const key = `${id}:${match.donor.id}`;
    if (!engine.assignments.has(key)) {
      const assignment = {
        id: uuidv4(),
        request_id: id,
        donor_id: match.donor.id,
        donor_name: match.donor.full_name,
        donor_phone: match.donor.phone,
        donor_blood_type: match.donor.blood_type,
        lat: match.donor.lat,
        lon: match.donor.lon,
        tier_level: emergencyReq.current_tier,
        status: 'PINGED',
        distance_km: match.distanceKm,
        distance_meters: match.distanceMeters,
        priority_score: match.priorityScore,
        notified_at: new Date().toISOString(),
      };
      engine.assignments.set(key, assignment);
      newAssignments.push(assignment);
    }
  }

  broadcast({
    type: 'TIER_ESCALATED',
    requestId: id,
    tier: emergencyReq.current_tier,
    radiusKm: tierConfig.radiusKm,
    newAssignments,
  });

  res.json({
    request: emergencyReq,
    tierConfig,
    newAssignmentsCount: newAssignments.length,
    newAssignments,
  });
});

// Live Radar Snapshot
app.get('/api/emergency/:id/radar', (req, res) => {
  const { id } = req.params;
  const emergencyReq = engine.activeRequests.get(id);
  if (!emergencyReq) return res.status(404).json({ error: 'Emergency request not found' });

  const hospital = engine.hospitals.get(emergencyReq.hospital_id);

  // Gather all assignments for this request
  const assignments = [];
  for (const [key, val] of engine.assignments.entries()) {
    if (key.startsWith(`${id}:`)) {
      assignments.push(val);
    }
  }

  res.json({
    request: emergencyReq,
    hospital,
    tiers: [
      { tier: 1, radiusKm: 1, active: emergencyReq.current_tier >= 1 },
      { tier: 2, radiusKm: 5, active: emergencyReq.current_tier >= 2 },
      { tier: 3, radiusKm: 15, active: emergencyReq.current_tier >= 3 },
    ],
    assignments,
  });
});

// List all active emergencies
app.get('/api/emergency/active', (req, res) => {
  res.json(Array.from(engine.activeRequests.values()));
});

// Donor responds to emergency request (ACCEPT or DECLINE)
app.post('/api/emergency/:id/respond', (req, res) => {
  const { id } = req.params;
  const { donor_id, response } = req.body;

  const emergencyReq = engine.activeRequests.get(id);
  if (!emergencyReq) return res.status(404).json({ error: 'Emergency request not found' });

  const key = `${id}:${donor_id}`;
  let assignment = engine.assignments.get(key);

  if (!assignment) {
    const donor = engine.donors.get(donor_id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    assignment = {
      id: uuidv4(),
      request_id: id,
      donor_id: donor.id,
      donor_name: donor.full_name,
      donor_phone: donor.phone,
      donor_blood_type: donor.blood_type,
      lat: donor.lat,
      lon: donor.lon,
      tier_level: emergencyReq.current_tier,
      status: 'PINGED',
      distance_km: calculateDistanceKm(emergencyReq.hospital_lat, emergencyReq.hospital_lon, donor.lat, donor.lon),
      notified_at: new Date().toISOString(),
    };
    engine.assignments.set(key, assignment);
  }

  assignment.status = response === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
  assignment.responded_at = new Date().toISOString();

  let qrData = null;
  if (response === 'ACCEPTED') {
    qrData = generateArrivalToken({
      requestId: id,
      donorId: donor_id,
      hospitalId: emergencyReq.hospital_id,
      bloodType: emergencyReq.blood_type,
    });
    assignment.qr_token = qrData.token;
  }

  broadcast({
    type: 'DONOR_RESPONSE_UPDATED',
    requestId: id,
    donorId: donor_id,
    status: assignment.status,
    assignment,
  });

  res.json({
    success: true,
    status: assignment.status,
    qrPass: qrData,
    assignment,
  });
});

// Hospital scans and verifies Donor QR Token
app.post('/api/emergency/verify-arrival', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  const verification = verifyArrivalToken(token);
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error });
  }

  const { requestId, donorId } = verification.data;
  const emergencyReq = engine.activeRequests.get(requestId);
  const donor = engine.donors.get(donorId);

  if (!emergencyReq) {
    return res.status(404).json({ error: 'Emergency request record not found' });
  }
  if (!donor) {
    return res.status(404).json({ error: 'Donor profile record not found' });
  }

  const key = `${requestId}:${donorId}`;
  const assignment = engine.assignments.get(key);

  if (assignment) {
    assignment.status = 'COMPLETED';
    assignment.arrived_at = new Date().toISOString();
  }

  // Update Donor reliability score: +15 points per spec Section 7.2
  const oldScore = donor.reliability_score || 100;
  donor.reliability_score = oldScore + 15;
  donor.last_donation_date = new Date().toISOString().split('T')[0];
  engine.registerDonor(donor);

  // Increment collected units
  emergencyReq.units_collected = (emergencyReq.units_collected || 0) + 1;
  if (emergencyReq.units_collected >= emergencyReq.units_needed) {
    emergencyReq.status = 'FULFILLED';
  }

  broadcast({
    type: 'DONOR_VERIFIED_ARRIVAL',
    requestId,
    donorId,
    donorName: donor.full_name,
    newReliabilityScore: donor.reliability_score,
    scoreAwarded: 15,
    unitsCollected: emergencyReq.units_collected,
    unitsNeeded: emergencyReq.units_needed,
    requestStatus: emergencyReq.status,
  });

  res.json({
    success: true,
    message: 'Arrival verified successfully! +15 Reliability Score credited.',
    donor: {
      id: donor.id,
      name: donor.full_name,
      previousScore: oldScore,
      newScore: donor.reliability_score,
      pointsCredited: 15,
      cooldownResetDate: donor.last_donation_date,
    },
    emergencyRequest: emergencyReq,
  });
});

// Reset seed state
app.post('/api/simulation/reset', (req, res) => {
  engine.geoStores.clear();
  engine.donors.clear();
  engine.hospitals.clear();
  engine.activeRequests.clear();
  engine.assignments.clear();
  loadSeedData();
  broadcast({ type: 'SIMULATION_RESET' });
  res.json({ success: true, message: 'Simulation database reset to clean state' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Pulse Dial Backend] Microservice active on http://localhost:${PORT}`);
  console.log(`[Pulse Dial Backend] WebSocket endpoint: ws://localhost:${PORT}/ws`);
});
