import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../useAppStore'

const reset = () => {
  localStorage.clear()
  useAppStore.setState({
    pin: null,
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
    expect(s.pinSetupDone).toBe(false)
  })

  it('starts unlocked', () => {
    expect(useAppStore.getState().isLocked).toBe(false)
  })

  it('has zero wrong attempts', () => {
    expect(useAppStore.getState().wrongAttempts).toBe(0)
  })
})

describe('setPin', () => {
  it('sets the PIN and marks setup done', () => {
    useAppStore.getState().setPin('1234')
    const s = useAppStore.getState()
    expect(s.pin).toBe('1234')
    expect(s.pinSetupDone).toBe(true)
  })

  it('clears lock state when PIN is set', () => {
    useAppStore.setState({ isLocked: true })
    useAppStore.getState().setPin('5678')
    expect(useAppStore.getState().isLocked).toBe(false)
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
  beforeEach(() => {
    useAppStore.getState().setPin('1234')
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

  it('resets PIN and clears state after 3 wrong attempts', () => {
    useAppStore.getState().wrongPin()
    useAppStore.getState().wrongPin()
    useAppStore.getState().wrongPin()
    const s = useAppStore.getState()
    expect(s.pin).toBeNull()
    expect(s.pinSetupDone).toBe(false)
    expect(s.wrongAttempts).toBe(0)
    expect(s.isLocked).toBe(false)
    expect(s.biometricEnabled).toBe(false)
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
