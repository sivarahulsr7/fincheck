// PBKDF2-SHA256 hashing for the local unlock PIN.
//
// The raw PIN is never persisted once a hash exists. Runs in a secure context
// (https / localhost). If crypto.subtle is unavailable (non-secure context),
// callers fall back to storing the PIN as-is — the app still works, just
// without the hardening.

export const cryptoAvailable = () =>
  typeof crypto !== 'undefined' &&
  !!crypto.subtle &&
  typeof crypto.subtle.importKey === 'function' &&
  typeof crypto.getRandomValues === 'function'

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export function genSalt() {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return toHex(a)
}

// Deterministic: the same (pin, salt) always yields the same hex digest.
export async function hashPin(pin, saltHex) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveBits']
  )
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return toHex(bits)
}
