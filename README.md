# Pulse Dial: Geofenced Rapid Emergency Blood Dispatch System

> **Document Version**: 1.0.0  
> **Classification**: Engineering Specification & System Architecture Implementation  
> **Status**: Production-Grade Reference Implementation & Automated Drill Suite  

Pulse Dial replaces slow, archaic 45–90 minute manual cold-calling trees with sub-second spatial matching, radial escalation boundaries (1 km → 5 km → 15 km), automated 90-day cooldown tracking, and high-priority donor dispatch.

---

## 1. System Architecture

```
+-------------------------------------------------------------------------+
|                         HOSPITAL WEB PORTAL                             |
|               (React 18 + Vite + Tailwind + Leaflet)                    |
|   - 1-Click Emergency Modal (Blood Group, Units, Urgency)               |
|   - Live Dispatch Radar (Concentric 1 km, 5 km, 15 km pulse rings)       |
|   - Fast QR Scanner Interface (Single scan +15 Reliability score)       |
+------------------------------------+------------------------------------+
                                     | REST & WebSocket
                                     v
+-------------------------------------------------------------------------+
|                         CORE BACKEND ENGINE                             |
|                 (Node.js / Express + WebSockets)                        |
|   - Stage 1: Partitioned In-Memory Spatial Index (Redis Geohashes)      |
|   - Stage 2: 90-Day Cooldown & Availability Bitset Intersections        |
|   - Stage 3: Multi-Factor Composite Priority Scoring Function P(d)      |
|   - Radial Escalation State Machine (Tier 1 -> Tier 2 -> Tier 3)        |
|   - Cryptographic HMAC-SHA256 Arrival Pass Signer & Validator           |
+------------------------------------+------------------------------------+
                                     | High Priority Push & WebSockets
                                     v
+-------------------------------------------------------------------------+
|                     CITIZEN DONOR MOBILE CLIENT                         |
|         (Native Android / Flutter + Dual Interactive Web PWA)           |
|   - 90-Day Medical Cooldown Gauge & Dynamic Karma Score                 |
|   - Full-Screen Emergency Wakeup (Doze bypass + synthesized siren)       |
|   - 4-Question Clinical Medical Pre-Screening Checklist                 |
|   - Dynamic En Route Arrival Pass with encrypted QR code                |
+-------------------------------------------------------------------------+
```

---

## 2. High-Performance Matching Algorithm & Scoring Function

### Stage 1: In-Memory Spatial Filtering
Coordinates are indexed into sorted sets keyed by compatible blood groups (e.g. `donors:geo:O_NEG`, `donors:geo:B_POS`). A query at hospital coordinates executes in $< 1\text{ ms}$:
```
GEOSEARCH donors:geo:O_NEG FROMLONLAT 76.2144 10.5276 BYRADIUS 1 km WITHDIST WITHCOORD ASC COUNT 50
```

### Stage 2: Cooldown & Availability Bitsets
Candidates returned by the spatial search are intersected against:
- `donors:eligible`: Verifies that donor's `last_donation_date` is $> 90\text{ days}$ ago.
- `donors:active`: Real-time toggle on whether the donor is available.

### Stage 3: Composite Priority Scoring Function
Eligible donors are ranked using the exact multi-factor priority function:
$$P(d) = [0.45 \times \frac{1}{\max(\text{Distance}_{\text{km}}, 0.1)}] + [0.40 \times \frac{\text{Reliability\_Score}}{150.0}] + [0.15 \times \text{Freshness\_Factor}]$$

---

## 3. Radial Escalation State Machine

| Tier | Radius Boundary | Dispatch Multiplier | Target Group |
|---|---|---|---|
| **Tier 1** | $\le 1\text{ km}$ | $3\times$ required units | Hospital staff, visitors, immediate perimeter |
| **Tier 2** | $\le 5\text{ km}$ | $2\times$ required units | Neighborhood donors within a 10-minute drive |
| **Tier 3** | $\le 15\text{ km}$ | Extended | City-wide escalation for rare blood types or mass casualties |

---

## 4. PostgreSQL 16 + PostGIS Database Schema

The production PostGIS schema is located in `database/schema.sql`, featuring:
- `hospitals` table with `GEOGRAPHY(Point, 4326)` and GiST spatial index `idx_hospital_location`.
- `donors` table with `GEOGRAPHY(Point, 4326)`, GiST index `idx_donor_location`, and composite index on `(blood_type, is_available, last_donation_date)`.
- `emergency_requests` with `urgency_level` (`NORMAL`, `URGENT`, `CRITICAL`) and `request_status` (`DISPATCHING`, `FULFILLED`, `EXPIRED`, `CANCELLED`).
- `dispatch_assignments` tracking individual donor responses (`PINGED`, `ACCEPTED`, `DECLINED`, `ARRIVED`, `COMPLETED`, `NO_SHOW`).

---

## 5. Directory Structure

```
pulse-dial/
├── backend/
│   ├── src/
│   │   ├── server.js               # REST API & WebSocket broadcast hub
│   │   ├── spatialEngine.js        # Redis Geohash, Bitset checks, Priority Scorer P(d)
│   │   └── services/
│   │       └── qrService.js        # HMAC-SHA256 arrival token generator & verifier
│   └── package.json
├── database/
│   ├── schema.sql                  # PostgreSQL 16 + PostGIS schema & GiST indexes
│   └── seed.json                   # Geospatial seed data around trauma coordinates
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Unified Command Radar & Donor Simulator
│   │   ├── components/
│   │   │   ├── LiveRadarMap.jsx    # Leaflet radar with dark tiles and animated rings
│   │   │   ├── SosTriggerModal.jsx # 1-Click SOS emergency trigger
│   │   │   ├── QrScannerModal.jsx  # Workstation fast QR scanner
│   │   │   └── DonorMobileSimulator.jsx # Full-screen alert, audio siren, 4-step checklist
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── mobile-client/
│   └── android_flutter/            # Native Android & Flutter project
│       ├── android/
│       │   └── app/src/main/
│       │       ├── AndroidManifest.xml # Doze bypass, WakeLock, Full-screen intent
│       │       └── kotlin/.../EmergencyDispatchFirebaseMessagingService.kt
│       ├── lib/
│       │   ├── main.dart
│       │   └── screens/
│       └── pubspec.yaml
├── simulator/
│   └── drill.js                    # Automated end-to-end benchmark & validation runner
└── package.json
```

---

## 6. Running the System

### A. Run the Automated Drill & Benchmark (Sub-Millisecond Verification)
```bash
npm run drill
```
*Validates spatial search latency ($< 1\text{ ms}$), cooldown exclusions, priority score ranking, radial tier expansions, and cryptographic QR token generation/verification.*

### B. Start the Core Backend Microservice
```bash
npm run start:backend
```
*Listens on `http://localhost:4000` with WebSocket stream on `ws://localhost:4000/ws`.*

### C. Start the Hospital Portal & Donor Mobile Simulator
```bash
npm run start:frontend
```
*Opens at `http://localhost:5173` with interactive radar, 1-click SOS dispatch, audio alert simulation, 4-step clinical pre-screening, and QR check-in.*
