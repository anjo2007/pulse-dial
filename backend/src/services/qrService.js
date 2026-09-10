// ==========================================================
// Pulse Dial: Cryptographic Arrival Token & QR Pass Service
// Conforms to Section 7.1 & 7.2 of Technical Specification
// ==========================================================

import crypto from 'crypto';

const SECRET_KEY = process.env.QR_SECRET || 'pulse-dial-emergency-secret-key-2026';

/**
 * Generates an encrypted/signed arrival token for donor check-in
 */
export function generateArrivalToken(payload) {
  const data = {
    ...payload,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour validity
  };

  const serialized = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(serialized)
    .digest('hex');

  const token = Buffer.from(JSON.stringify({ data, signature })).toString('base64');
  return { token, expiresAt: data.expiresAt };
}

/**
 * Validates the arrival token scanned by the hospital portal
 */
export function verifyArrivalToken(base64Token) {
  try {
    const raw = Buffer.from(base64Token, 'base64').toString('utf8');
    const { data, signature } = JSON.parse(raw);

    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(JSON.stringify(data))
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Cryptographic signature mismatch. Possible counterfeit token.' };
    }

    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'Arrival pass has expired. Please re-issue pass.' };
    }

    return { valid: true, data };
  } catch (err) {
    return { valid: false, error: 'Malformed token string: ' + err.message };
  }
}
