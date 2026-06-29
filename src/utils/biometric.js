const STORAGE_KEY = 'fincheck-biometric-id'

export async function isBiometricAvailable() {
  try {
    return !!(
      window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    )
  } catch {
    return false
  }
}

export function isBiometricRegistered() {
  return !!localStorage.getItem(STORAGE_KEY)
}

export async function registerBiometric(userId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Fin Check', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId || 'fincheck-user'),
        name: 'fincheck',
        displayName: 'Fin Check',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  })
  const id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
  localStorage.setItem(STORAGE_KEY, id)
  return true
}

export async function authenticateWithBiometric() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) throw new Error('No biometric registered')

  const credId = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  try {
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: credId }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return true
  } catch (e) {
    // Credential no longer exists (wrong context, device restore, etc.) — clear stale ID
    if (e.name === 'NotAllowedError' || e.name === 'InvalidStateError' || e.name === 'NotFoundError') {
      clearBiometric()
    }
    throw e
  }
}

export function clearBiometric() {
  localStorage.removeItem(STORAGE_KEY)
}
