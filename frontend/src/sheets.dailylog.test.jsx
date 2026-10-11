// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { dailyLogSheet } from './sheets.jsx'
import { withDailyLog } from './lib/daily-log.js'

const mounted = []

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

const setS = (over = {}) => useStore.setState(s => ({
  S: { ...s.S, dailyLogs: {}, workouts: [], ...over },
  user: null,
}))

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => { mounted.splice(0).forEach(r => r.unmount()) })
})

describe('DailyLogSheet', () => {
  it('renders empty log view for a given day', () => {
    setS()
    dailyLogSheet('2026-10-10')
    const host = renderTop()

    expect(host.querySelector('h3').textContent).toBe('Daily log')
    expect(host.textContent).toContain('Water (L)')
    expect(host.textContent).toContain('Sleep (hours)')
    expect(host.textContent).toContain('Mood')
    expect(host.textContent).toContain('Energy')
    expect(host.textContent).toContain('Cardio (minutes)')
  })

  it('renders existing daily log and allows saving changes', () => {
    const dailyLogs = withDailyLog({}, '2026-10-10', {
      water: 2.5,
      sleep: 8,
      mood: 4,
      energy: 4,
      cardioMin: 20,
      notes: 'Feeling good',
    })
    setS({ dailyLogs })

    dailyLogSheet('2026-10-10')
    const host = renderTop()

    expect(host.textContent).toContain('Daily score:')
    expect(host.querySelector('textarea').value).toBe('Feeling good')

    // Change notes and click save
    const textarea = host.querySelector('textarea')
    act(() => {
      textarea.value = 'Updated notes'
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const saveBtn = [...host.querySelectorAll('button')].find(b => b.textContent === 'Save')
    act(() => { saveBtn.click() })

    const S = useStore.getState().S
    expect(S.dailyLogs['2026-10-10'].notes).toBe('Updated notes')
  })

  it('can clear an existing log', () => {
    const dailyLogs = withDailyLog({}, '2026-10-10', { water: 3 })
    setS({ dailyLogs })

    dailyLogSheet('2026-10-10')
    const host = renderTop()

    const clearBtn = [...host.querySelectorAll('button')].find(b => b.textContent === 'Clear log')
    expect(clearBtn).toBeTruthy()
    act(() => { clearBtn.click() })

    const S = useStore.getState().S
    expect(S.dailyLogs['2026-10-10']).toMatchObject({ _ts: expect.any(Number) })
    expect(S.dailyLogs['2026-10-10'].water).toBeUndefined()
  })
})
