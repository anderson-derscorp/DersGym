import { describe, expect, it } from 'vitest'
import * as Server from '../../../api/sync-stamps.js'
import {
  dailyLogOf,
  dailyLogScore,
  isDailyLogDay,
  MOOD_LABELS,
  ENERGY_LABELS,
  readDailyLog,
  withDailyLog,
  DAILY_LOG_NOTE_MAX,
} from './daily-log.js'
import { highestStamp, localExtras, mergeStates, resetIdsOf, stampChange, STAMPED_MAPS } from './sync-merge.js'

const base = (over = {}) => ({
  unit: 'kg', week: {}, dayPlan: {}, workouts: [], routines: [], bodyweight: [], customEx: [], favEx: [],
  exWeights: {}, exNotes: {}, barWeights: {}, equipProfiles: [], gymCards: [], _ts: 0, ...over,
})
const clone = o => JSON.parse(JSON.stringify(o))
const D = '2026-10-10'

describe('daily log: reading and writing', () => {
  it('reads numbers and notes with bounds; junk entries return null', () => {
    expect(readDailyLog({ water: 2.5, sleep: 8, mood: 4, energy: 5, cardioMin: 30, notes: 'Good day' })).toEqual({
      water: 2.5, sleep: 8, mood: 4, energy: 5, cardioMin: 30, notes: 'Good day',
    })
    expect(readDailyLog({ water: -1, sleep: 25, mood: 6, energy: 0 })).toBeNull()
    expect(readDailyLog({ notes: '   ' })).toBeNull()
    expect(readDailyLog({ _ts: 100 })).toBeNull()
    for (const junk of [null, undefined, 42, 'string', []]) {
      expect(readDailyLog(junk)).toBeNull()
    }
  })

  it('clamps and sanitizes fields appropriately', () => {
    const res = readDailyLog({ water: 25, sleep: 24, cardioMin: 700, notes: 'x'.repeat(600) })
    expect(res.water).toBe(20)
    expect(res.sleep).toBe(24)
    expect(res.cardioMin).toBe(600)
    expect(res.notes.length).toBe(DAILY_LOG_NOTE_MAX)
  })

  it('writes a stamped entry, and an empty entry as a stamped clear', () => {
    const m = withDailyLog({}, D, { water: 3.0, sleep: 7.5 }, 10)
    expect(m[D]).toMatchObject({ water: 3.0, sleep: 7.5, _ts: 10 })
    const cleared = withDailyLog(m, D, null, 11)
    expect(cleared[D]).toEqual({ _ts: 11 })
    expect(dailyLogOf({ dailyLogs: cleared }, D)).toBeNull()
  })

  it('validates ISO day formats', () => {
    expect(isDailyLogDay('2026-10-10')).toBe(true)
    expect(isDailyLogDay('2026-02-28')).toBe(true)
    expect(isDailyLogDay('invalid')).toBe(false)
    expect(isDailyLogDay('')).toBe(false)
  })

  it('computes daily score between 0 and 100', () => {
    const optimal = { water: 3.5, sleep: 8, energy: 5, mood: 5, cardioMin: 30 }
    expect(dailyLogScore(optimal, true)).toBe(100)

    const partial = { water: 2.0, sleep: 6.5, energy: 3, mood: 3 }
    const score = dailyLogScore(partial, false)
    expect(score).toBeGreaterThan(40)
    expect(score).toBeLessThan(80)

    expect(dailyLogScore(null, false)).toBeNull()
    expect(dailyLogScore(null, true)).toBe(10)
  })
})

describe('daily logs across devices', () => {
  it('logs written on different days on two devices are both kept', () => {
    const phone = base({ _ts: 100, dailyLogs: withDailyLog({}, '2026-10-09', { water: 2.0 }, 90) })
    const desk = base({ _ts: 200, dailyLogs: withDailyLog({}, '2026-10-10', { water: 3.0 }, 40) })
    for (const m of [mergeStates(phone, desk), mergeStates(desk, phone)]) {
      expect(dailyLogOf(m, '2026-10-09')).toEqual({ water: 2.0 })
      expect(dailyLogOf(m, '2026-10-10')).toEqual({ water: 3.0 })
    }
  })

  it('the same day keeps the log written last, regardless of total state timestamp', () => {
    const phone = base({ _ts: 100, dailyLogs: withDailyLog({}, D, { sleep: 7 }, 90) })
    const desk = base({ _ts: 300, dailyLogs: withDailyLog({}, D, { sleep: 6 }, 40) })
    for (const m of [mergeStates(phone, desk), mergeStates(desk, phone)]) {
      expect(dailyLogOf(m, D)).toEqual({ sleep: 7 })
    }
  })

  it('cleared log stays cleared against older entries', () => {
    const cleared = base({ _ts: 100, dailyLogs: withDailyLog({}, D, null, 80) })
    const stale = base({ _ts: 300, dailyLogs: withDailyLog({}, D, { water: 2.5 }, 40) })
    for (const m of [mergeStates(cleared, stale), mergeStates(stale, cleared)]) {
      expect(dailyLogOf(m, D)).toBeNull()
    }
  })

  it('"Reset everything" wipes daily logs of older copies', () => {
    const before = base({ _ts: 1000, dailyLogs: withDailyLog({}, D, { water: 2.0 }, 900) })
    const reset = base({ _ts: 2000, resetAt: 2000, resetIds: resetIdsOf(before) })
    expect(reset.resetIds.dailyLogs).toEqual([D])
    const stale = clone(before); stale._ts = 2100
    for (const m of [mergeStates(reset, stale), mergeStates(stale, reset)]) {
      expect(dailyLogOf(m, D)).toBeNull()
    }
  })
})
