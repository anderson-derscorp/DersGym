// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { feedbackSheet } from './sheets.jsx'
import { withFeedback } from './lib/feedbacks.js'

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

const setS = (over = {}) =>
  useStore.setState(s => ({
    S: { ...s.S, feedbacks: {}, bodyweight: [], measurements: [], ...over },
    user: null,
  }))

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach(r => r.unmount())
  })
})

describe('FeedbackSheet', () => {
  it('opens directly in new check-in form when no feedbacks exist', () => {
    setS()
    feedbackSheet()
    const host = renderTop()

    expect(host.querySelector('h3').textContent).toBe('Biweekly check-in')
    expect(host.textContent).toContain('Body measurements')
    expect(host.textContent).toContain('Wellness & energy ratings')
    expect(host.textContent).toContain('Save biweekly feedback')
  })

  it('renders summary and deltas when feedbacks exist', () => {
    let feedbacks = {}
    feedbacks = withFeedback(feedbacks, 'fb1', {
      d: '2026-09-15',
      bw: 84.0,
      waist: 86,
      mood: 7,
      energy: 6,
    }, 100)
    feedbacks = withFeedback(feedbacks, 'fb2', {
      d: '2026-10-01',
      bw: 82.5,
      waist: 84,
      mood: 9,
      energy: 8,
      wins: 'All training days complete',
    }, 200)

    setS({ feedbacks })
    feedbackSheet()
    const host = renderTop()

    expect(host.textContent).toContain('Latest check-in')
    expect(host.textContent).toContain('82.5')
    expect(host.textContent).toContain('Weight: -1.5')
    expect(host.textContent).toContain('Waist: -2')
    expect(host.textContent).toContain('All training days complete')
    expect(host.textContent).toContain('Previous check-ins')
  })

  it('allows clicking new check-in button to switch to form', () => {
    let feedbacks = {}
    feedbacks = withFeedback(feedbacks, 'fb1', { d: '2026-10-01', bw: 80 }, 100)
    setS({ feedbacks })
    feedbackSheet()
    const host = renderTop()

    const newBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('New check-in'))
    expect(newBtn).toBeDefined()
    act(() => {
      newBtn.click()
    })

    expect(host.textContent).toContain('Save biweekly feedback')
  })
})
