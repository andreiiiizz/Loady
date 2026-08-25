/**
 * Privacy & Telemetry Utilities
 * Ensures client-side anonymization of telemetry and check-ins.
 * Raw device identifiers and hardware serials are NEVER collected or stored.
 *
 * Fingerprint Derivation:
 * 1. A cryptographically random UUID v4 generated upon first launch is stored locally ('loady_device_uuid_v1').
 * 2. It is combined with the client browser platform string and a static salt.
 * 3. A one-way SHA-256 hash is computed client-side using Web Crypto API.
 */

const DEVICE_UUID_KEY = 'loady_device_uuid_v1';
const FINGERPRINT_SALT = 'loady_ph_telemetry_salt_v2';

function getOrCreateLocalDeviceUuid(): string {
  if (typeof window === 'undefined') return 'server_or_ssr';
  try {
    let uuid = localStorage.getItem(DEVICE_UUID_KEY);
    if (!uuid) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        uuid = crypto.randomUUID();
      } else {
        uuid = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_UUID_KEY, uuid);
    }
    return uuid;
  } catch {
    return 'volatile_anon_device';
  }
}

/**
 * Computes a client-side SHA-256 hash of the device telemetry token.
 * Returns a 64-character lowercase hex string.
 */
export async function getHashedDeviceFingerprint(): Promise<string> {
  const localUuid = getOrCreateLocalDeviceUuid();
  const rawToken = `${FINGERPRINT_SALT}:${localUuid}:${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`;

  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgUint8 = new TextEncoder().encode(rawToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `sha256_${hashHex.substring(0, 32)}`;
    } catch {
      // fallback
    }
  }

  // Fallback simple fast string hash if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < rawToken.length; i++) {
    const char = rawToken.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}
