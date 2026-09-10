// ==========================================================
// Pulse Dial: In-Memory Spatial Indexing & Priority Matching
// Conforms to Section 4 & 5 of Technical Specification v1.0.0
// ==========================================================

// Blood compatibility mapping: Target Blood Type -> Compatible Donor Blood Types
export const BLOOD_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

// Earth radius in kilometers for Haversine distance
const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates Great-Circle distance in kilometers between two lat/lon pairs
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Checks if donor is past the mandatory 90-day whole blood cooldown
 */
export function isEligibleCooldown(lastDonationDateStr, referenceDate = new Date()) {
  if (!lastDonationDateStr) return true;
  const lastDate = new Date(lastDonationDateStr);
  const diffTime = referenceDate.getTime() - lastDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 90;
}

/**
 * Returns the remaining cooldown in days
 */
export function getRemainingCooldownDays(lastDonationDateStr, referenceDate = new Date()) {
  if (!lastDonationDateStr) return 0;
  const lastDate = new Date(lastDonationDateStr);
  const diffTime = referenceDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, 90 - diffDays);
}

/**
 * Computes Freshness Factor based on minutes since last location heartbeat:
 * 1.0 if within 30 minutes, decaying linearly to 0.1 at 120 minutes.
 */
export function calculateFreshnessFactor(minutesSinceHeartbeat) {
  if (minutesSinceHeartbeat === undefined || minutesSinceHeartbeat === null) return 0.5;
  if (minutesSinceHeartbeat <= 30) return 1.0;
  if (minutesSinceHeartbeat >= 120) return 0.1;
  return 1.0 - ((minutesSinceHeartbeat - 30) / 90) * 0.9;
}

/**
 * Composite Priority Scoring Function:
 * P(d) = [w1 * (1 / max(Distance_km, 0.1))] + [w2 * (Reliability_Score / 150.0)] + [w3 * Freshness_Factor]
 * Weights: w1 = 0.45, w2 = 0.40, w3 = 0.15
 */
export function calculatePriorityScore(distanceKm, reliabilityScore, minutesSinceHeartbeat) {
  const w1 = 0.45;
  const w2 = 0.40;
  const w3 = 0.15;

  const proximityTerm = 1 / Math.max(distanceKm, 0.1);
  const reliabilityTerm = (reliabilityScore || 100) / 150.0;
  const freshnessTerm = calculateFreshnessFactor(minutesSinceHeartbeat);

  const score = w1 * proximityTerm + w2 * reliabilityTerm + w3 * freshnessTerm;
  return Math.round(score * 1000) / 1000;
}

/**
 * High-performance In-Memory Spatial & Geohash Engine
 * Implements Redis GEOSEARCH logic, Bitset filtering, and multi-tier radial escalation.
 */
export class SpatialDispatchEngine {
  constructor() {
    // Partitioned stores simulating Redis `donors:geo:<BLOOD_TYPE>`
    this.geoStores = new Map();
    // Donor profile store
    this.donors = new Map();
    // Hospitals store
    this.hospitals = new Map();
    // Active emergency requests and escalation jobs
    this.activeRequests = new Map();
    // Dispatch assignments
    this.assignments = new Map();
  }

  /**
   * Register or update a donor in the spatial index
   */
  registerDonor(donor) {
    this.donors.set(donor.id, { ...donor });

    // Normalize blood type key: e.g., O_NEG, B_POS
    const key = donor.blood_type.replace('-', '_NEG').replace('+', '_POS');
    if (!this.geoStores.has(key)) {
      this.geoStores.set(key, new Set());
    }
    this.geoStores.get(key).add(donor.id);
  }

  /**
   * Register a hospital
   */
  registerHospital(hospital) {
    this.hospitals.set(hospital.id, hospital);
  }

  /**
   * Stage 1 & Stage 2: Spatial search & Bitset filtering within a radial tier
   */
  searchEligibleDonors(hospitalLat, hospitalLon, targetBloodType, radiusKm, count = 50) {
    const startTime = performance.now();
    const compatibleGroups = BLOOD_COMPATIBILITY[targetBloodType] || [targetBloodType];

    const candidates = [];

    for (const bg of compatibleGroups) {
      const key = bg.replace('-', '_NEG').replace('+', '_POS');
      const donorIds = this.geoStores.get(key);
      if (!donorIds) continue;

      for (const donorId of donorIds) {
        const donor = this.donors.get(donorId);
        if (!donor) continue;

        // Stage 2: Bitset Checks
        // Check availability (donors:active)
        if (!donor.is_available) continue;

        // Check 90-day cooldown (donors:eligible)
        if (!isEligibleCooldown(donor.last_donation_date)) continue;

        // Stage 1: Spatial Distance (simulating Redis GEOSEARCH)
        const distanceKm = calculateDistanceKm(hospitalLat, hospitalLon, donor.lat, donor.lon);
        if (distanceKm <= radiusKm) {
          // Stage 3: Priority Scoring
          const priorityScore = calculatePriorityScore(
            distanceKm,
            donor.reliability_score,
            donor.minutes_since_heartbeat || 10
          );

          candidates.push({
            donor,
            distanceKm: Math.round(distanceKm * 1000) / 1000,
            distanceMeters: Math.round(distanceKm * 1000),
            priorityScore,
            freshnessFactor: calculateFreshnessFactor(donor.minutes_since_heartbeat || 10),
          });
        }
      }
    }

    // Rank descending by Priority Score P(d)
    candidates.sort((a, b) => b.priorityScore - a.priorityScore);

    const queryLatencyMs = performance.now() - startTime;
    return {
      candidates: candidates.slice(0, count),
      totalMatches: candidates.length,
      queryLatencyMs: Math.round(queryLatencyMs * 100) / 100,
    };
  }

  /**
   * Tier Escalation Parameters
   */
  getTierConfig(tier) {
    switch (tier) {
      case 1:
        return { tier: 1, radiusKm: 1, timeoutSec: 180, multiplier: 3, label: 'Immediate Perimeter (<= 1 km)' };
      case 2:
        return { tier: 2, radiusKm: 5, timeoutSec: 300, multiplier: 2, label: 'Neighborhood Drive (<= 5 km)' };
      case 3:
        return { tier: 3, radiusKm: 15, timeoutSec: 600, multiplier: 1, label: 'City-Wide Emergency (<= 15 km)' };
      default:
        return { tier: 1, radiusKm: 1, timeoutSec: 180, multiplier: 3, label: 'Immediate Perimeter' };
    }
  }
}
