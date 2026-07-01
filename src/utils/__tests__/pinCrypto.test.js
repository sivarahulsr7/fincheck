import { describe, it, expect } from 'vitest'
import { genSalt, hashPin, cryptoAvailable } from '../pinCrypto'

describe('pinCrypto', () => {
  it('crypto.subtle is available in the test/runtime environment', () => {
    expect(cryptoAvailable()).toBe(true)
  })

  it('genSalt returns 32 hex chars (16 bytes) and varies', () => {
    const a = genSalt(), b = genSalt()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toBe(b)
  })

  it('hashPin is deterministic for the same pin + salt', async () => {
    const salt = genSalt()
    const h1 = await hashPin('1234', salt)
    const h2 = await hashPin('1234', salt)
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/) // 256 bits
  })

  it('a correct PIN verifies and a wrong PIN does not', async () => {
    const salt = genSalt()
    const stored = await hashPin('1234', salt)
    expect(await hashPin('1234', salt)).toBe(stored)
    expect(await hashPin('9999', salt)).not.toBe(stored)
  })

  it('different salts yield different hashes for the same PIN', async () => {
    const h1 = await hashPin('1234', genSalt())
    const h2 = await hashPin('1234', genSalt())
    expect(h1).not.toBe(h2)
  })
})
