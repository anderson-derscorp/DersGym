import { describe, it, expect } from 'vitest'
import {
  isFeedbackDay,
  newFeedbackId,
  readFeedback,
  feedbacksOf,
  withFeedback,
  latestFeedback,
  feedbackDeltas,
  daysBetween,
  isDueForFeedback,
} from './feedbacks.js'

describe('feedbacks domain logic', () => {
  it('validates calendar days', () => {
    expect(isFeedbackDay('2026-10-10')).toBe(true)
    expect(isFeedbackDay('2026-12-31')).toBe(true)
    expect(isFeedbackDay('invalid')).toBe(false)
    expect(isFeedbackDay(null)).toBe(false)
  })

  it('generates unique feedback IDs', () => {
    const id = newFeedbackId(1000, () => 0.42)
    expect(id.startsWith('fb')).toBe(true)
  })

  it('reads and cleans feedback entries', () => {
    expect(readFeedback(null)).toBeNull()
    expect(readFeedback({})).toBeNull()
    expect(readFeedback({ d: 'invalid' })).toBeNull()

    const clean = readFeedback({
      d: '2026-10-10',
      bw: '83.2',
      bodyFat: '18.4',
      waist: 85,
      hip: 101,
      arm: 37,
      thigh: 60,
      mood: 9,
      energy: 8,
      motivation: 10,
      stress: 2,
      wins: '  Consistent gym sessions  ',
      struggles: '  Late dinner  ',
      notes: 'Feeling great',
    })

    expect(clean).toEqual({
      d: '2026-10-10',
      bw: 83.2,
      bodyFat: 18.4,
      waist: 85,
      hip: 101,
      arm: 37,
      thigh: 60,
      mood: 9,
      energy: 8,
      motivation: 10,
      stress: 2,
      wins: 'Consistent gym sessions',
      struggles: 'Late dinner',
      notes: 'Feeling great',
    })
  })

  it('clamps invalid values and sanitizes ranges', () => {
    const clean = readFeedback({
      d: '2026-10-10',
      bw: 10, // below min (20) -> null
      bodyFat: 120, // above max (90) -> null
      mood: 15, // clampRating -> null
      stress: 0, // clampRating -> null
    })

    expect(clean).toEqual({ d: '2026-10-10' })
  })

  it('orders feedbacks newest first and supports deletion stamps', () => {
    let map = {}
    map = withFeedback(map, 'fb1', { d: '2026-09-01', bw: 85 }, 100)
    map = withFeedback(map, 'fb2', { d: '2026-09-15', bw: 84 }, 200)
    map = withFeedback(map, 'fb3', { d: '2026-10-01', bw: 82.5 }, 300)

    const list = feedbacksOf({ feedbacks: map })
    expect(list.map(f => f.id)).toEqual(['fb3', 'fb2', 'fb1'])
    expect(latestFeedback({ feedbacks: map }).id).toBe('fb3')

    // Delete fb2
    map = withFeedback(map, 'fb2', null, 400)
    expect(map.fb2).toEqual({ _ts: 400 })
    expect(feedbacksOf({ feedbacks: map }).map(f => f.id)).toEqual(['fb3', 'fb1'])
  })

  it('computes deltas correctly between two feedbacks', () => {
    const current = {
      bw: 82.5,
      bodyFat: 17.5,
      waist: 84,
      hip: 99,
      arm: 36.5,
      thigh: 59,
      mood: 9,
      energy: 8,
      motivation: 9,
      stress: 3,
    }
    const previous = {
      bw: 84.0,
      bodyFat: 18.2,
      waist: 86,
      hip: 101,
      arm: 36.0,
      thigh: 60,
      mood: 7,
      energy: 6,
      motivation: 8,
      stress: 5,
    }

    const deltas = feedbackDeltas(current, previous)
    expect(deltas.bw).toBe(-1.5)
    expect(deltas.bodyFat).toBe(-0.7)
    expect(deltas.waist).toBe(-2)
    expect(deltas.hip).toBe(-2)
    expect(deltas.arm).toBe(0.5)
    expect(deltas.thigh).toBe(-1)
    expect(deltas.mood).toBe(2)
    expect(deltas.energy).toBe(2)
    expect(deltas.motivation).toBe(1)
    expect(deltas.stress).toBe(-2)
  })

  it('calculates days between dates and due status for biweekly feedback', () => {
    expect(daysBetween('2026-10-01', '2026-10-15')).toBe(14)
    expect(daysBetween('2026-10-15', '2026-10-01')).toBe(14)

    // With no feedbacks, is due
    expect(isDueForFeedback({ feedbacks: {} }, '2026-10-15')).toBe(true)

    // Last feedback was 10 days ago -> not due
    const S = {
      feedbacks: {
        fb1: { d: '2026-10-05', _ts: 100 },
      },
    }
    expect(isDueForFeedback(S, '2026-10-15')).toBe(false)

    // Last feedback was 14 days ago -> due
    expect(isDueForFeedback(S, '2026-10-19')).toBe(true)
  })
})
