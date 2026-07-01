import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../useAppStore'

const reset = () => {
  localStorage.clear()
  useAppStore.setState({
    pin: null,
    pinHash: null,
    pinSalt: null,
    pinSetupDone: false,
    isLocked: false,
    wrongAttempts: 0,
    biometricEnabled: false,
    balancesHidden: false,
    activeTab: 'overview',
    moneySubTab: 'transactions',
    wealthSubTab: 'assets',
  })
}

beforeEach(reset)

describe('initial state', () => {
  it('has no PIN set', () => {
    const s = useAppStore.getState()
    expect(s.pin).toBeNull()
    expect(s.pinHash).toBeNull()
    expect(s.pinSetupDone).toBe(false)
  })

  it('starts unlocked', () => {
    expect(useAppStore.getState().isLocked).toBe(false)
  })

  it('has zero wrong attempts', () => {
    expect(useAppStore.getState().wrongAttempts).toBe(0)
  })
})

describe('setPin (hashed)', () => {
  it('stores a hash + salt, never the raw PIN, and marks setup done', async () => {
    await useAppStore.getState().setPin('1234')
    const s = useAppStore.getState()
    expect(s.pin).toBeNull()               // raw PIN never persisted
    expect(s.pinHash).toMatch(/^[0-9a-f]{64}$/)
    expect(s.pinSalt).toMatch(/^[0-9a-f]{32}$/)
    expect(s.pinSetupDone).toBe(true)
  })

  it('clears lock state when PIN is set', async () => {
    useAppStore.setState({ isLocked: true })
    await useAppStore.getState().setPin('5678')
    expect(useAppStore.getState().isLocked).toBe(false)
  })
})

describe('verifyPin', () => {
  it('accepts the correct PIN and rejects a wrong one', async () => {
    await useAppStore.getState().setPin('1234')
    expect(await useAppStore.getState().verifyPin('1234')).toBe(true)
    expect(await useAppStore.getState().verifyPin('0000')).toBe(false)
  })

  it('verifies against a legacy plaintext PIN when no hash exists', async () => {
    useAppStore.setState({ pin: '4321', pinHash: null, pinSalt: null, pinSetupDone: true })
    expect(await useAppStore.getState().verifyPin('4321')).toBe(true)
    expect(await useAppStore.getState().verifyPin('1111')).toBe(false)
  })
})

describe('upgradeLegacyPin', () => {
  it('migrates a plaintext PIN to a hash and clears the plaintext', async () => {
    useAppStore.setState({ pin: '2468', pinHash: null, pinSalt: null, pinSetupDone: true })
    await useAppStore.getState().upgradeLegacyPin()
    const s = useAppStore.getState()
    expect(s.pin).toBeNull()
    expect(s.pinHash).toMatch(/^[0-9a-f]{64}$/)
    // the upgraded hash still verifies the original PIN
    expect(await useAppStore.getState().verifyPin('2468')).toBe(true)
  })

  it('is a no-op when a hash already exists', async () => {
    await useAppStore.getState().setPin('1234')
    const before = useAppStore.getState().pinHash
    await useAppStore.getState().upgradeLegacyPin()
    expect(useAppStore.getState().pinHash).toBe(before)
  })

  it('does nothing when there is no PIN at all', async () => {
    await useAppStore.getState().upgradeLegacyPin()
    expect(useAppStore.getState().pinHash).toBeNull()
  })
})

describe('lock / unlock', () => {
  it('lock() sets isLocked true', () => {
    useAppStore.getState().lock()
    expect(useAppStore.getState().isLocked).toBe(true)
  })

  it('unlock() clears lock and resets wrong attempts', () => {
    useAppStore.setState({ isLocked: true, wrongAttempts: 2 })
    useAppStore.getState().unlock()
    const s = useAppStore.getState()
    expect(s.isLocked).toBe(false)
    expect(s.wrongAttempts).toBe(0)
  })
})

describe('wrongPin', () => {
  beforeEach(async () => {
    await useAppStore.getState().setPin('1234')
    useAppStore.getState().lock()
  })

  it('increments wrongAttempts on first wrong entry', () => {
    useAppStore.getState().wrongPin()
    expect(useAppStore.getState().wrongAttempts).toBe(1)
  })

  it('increments wrongAttempts on second wrong entry', () => {
    useAppStore.getState().wrongPin()
    useAppStore.getState().wrongPin()
    expect(useAppStore.getState().wrongAttempts).toBe(2)
  })

  it('resets PIN but STAYS LOCKED after 3 wrong attempts (no bypass)', () => {
    useAppStore.getState().wrongPin()
    useAppStore.getState().wrongPin()
    const reset = useAppStore.getState().wrongPin()
    const s = useAppStore.getState()
    expect(reset).toBe(true)          // signals the caller to sign out
    expect(s.pin).toBeNull()
    expect(s.pinSetupDone).toBe(false)
    expect(s.wrongAttempts).toBe(0)
    expect(s.isLocked).toBe(true)     // must remain locked — resetting must not grant access
    expect(s.biometricEnabled).toBe(false)
  })

  it('returns false while below the reset threshold', () => {
    expect(useAppStore.getState().wrongPin()).toBe(false)
    expect(useAppStore.getState().wrongPin()).toBe(false)
  })

  it('clears biometric storage key after 3 wrong attempts', () => {
    localStorage.setItem('fincheck-biometric-id', 'some-credential-id')
    useAppStore.getState().wrongPin()
    useAppStore.getState().wrongPin()
    useAppStore.getState().wrongPin()
    expect(localStorage.getItem('fincheck-biometric-id')).toBeNull()
  })
})

describe('toggleBalances', () => {
  it('flips balancesHidden', () => {
    expect(useAppStore.getState().balancesHidden).toBe(false)
    useAppStore.getState().toggleBalances()
    expect(useAppStore.getState().balancesHidden).toBe(true)
    useAppStore.getState().toggleBalances()
    expect(useAppStore.getState().balancesHidden).toBe(false)
  })
})

describe('tab navigation', () => {
  it('setActiveTab updates active tab', () => {
    useAppStore.getState().setActiveTab('wealth')
    expect(useAppStore.getState().activeTab).toBe('wealth')
  })

  it('setMoneySubTab updates money sub-tab', () => {
    useAppStore.getState().setMoneySubTab('budget')
    expect(useAppStore.getState().moneySubTab).toBe('budget')
  })

  it('setWealthSubTab updates wealth sub-tab', () => {
    useAppStore.getState().setWealthSubTab('liabilities')
    expect(useAppStore.getState().wealthSubTab).toBe('liabilities')
  })
})

describe('setBiometricEnabled', () => {
  it('enables biometric', () => {
    useAppStore.getState().setBiometricEnabled(true)
    expect(useAppStore.getState().biometricEnabled).toBe(true)
  })

  it('disables biometric', () => {
    useAppStore.setState({ biometricEnabled: true })
    useAppStore.getState().setBiometricEnabled(false)
    expect(useAppStore.getState().biometricEnabled).toBe(false)
  })
})
