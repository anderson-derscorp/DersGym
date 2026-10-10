// Supplements: the helpers, how two devices merge their list and their ticks, and that the
// server's copy of the sync rules (api/sync-stamps.js) treats both maps the same way.
import { describe, expect, it } from 'vitest'
import * as Server from '../../../api/sync-stamps.js'
import {
  SUPP_DOSE_MAX, SUPP_NAME_MAX, isSuppDay, newSuppId, readSupp, suppDay, suppStreak, suppsOf, takenOn, withSupp, withTaken,
} from './supplements.js'
import { highestStamp, localExtras, mergeStates, resetIdsOf, stampChange, STAMPED_MAPS } from './sync-merge.js'

const base = (over = {}) => ({
  unit: 'kg', week: {}, dayPlan: {}, workouts: [], routines: [], bodyweight: [], customEx: [], favEx: [],
  exWeights: {}, exNotes: {}, barWeights: {}, equipProfiles: [], gymCards: [], _ts: 0, ...over,
})
const clone = o => JSON.parse(JSON.stringify(o))
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const D = '2026-10-01'

describe('supplements: reading and writing', () => {
  it('reads a name with an optional dose and time; junk and cleared entries read as none', () => {
    expect(readSupp({ name: '  Creatine ', dose: '5 g', time: '08:00', _ts: 1 })).toEqual({ name: 'Creatine', dose: '5 g', time: '08:00' })
    expect(readSupp({ name: 'Zinc' })).toEqual({ name: 'Zinc', dose: '', time: '' })
    expect(readSupp({ name: 'Zinc', time: '8am' }).time).toBe('')
    expect(readSupp({ name: 'Zinc', time: '24:00' }).time).toBe('')
    expect(readSupp({ name: 'Zinc', time: '23:59' }).time).toBe('23:59')
    expect(readSupp({ name: '   ', dose: '1 g' })).toBeNull()
    expect(readSupp({ _ts: 5 })).toBeNull()
    for (const junk of [null, undefined, 'Zinc', 3, ['Zinc']]) expect(readSupp(junk)).toBeNull()
    expect(readSupp({ name: 'x'.repeat(SUPP_NAME_MAX + 20) }).name).toHaveLength(SUPP_NAME_MAX)
    expect(readSupp({ name: 'Zinc', dose: 'y'.repeat(SUPP_DOSE_MAX + 20) }).dose).toHaveLength(SUPP_DOSE_MAX)
  })

  it('writes a stamped entry per supplement, leaving out what is empty, and an empty name as a stamped clear', () => {
    const m = withSupp({ a: { name: 'Zinc', _ts: 3 } }, 'b', { name: ' Creatine ', dose: '5 g', time: '08:00' }, 10)
    expect(m).toEqual({ a: { name: 'Zinc', _ts: 3 }, b: { name: 'Creatine', dose: '5 g', time: '08:00', _ts: 10 } })
    expect(withSupp({}, 'c', { name: 'Omega 3', dose: '  ', time: '' }, 11)).toEqual({ c: { name: 'Omega 3', _ts: 11 } })
    const cleared = withSupp(m, 'b', { name: '  ' }, 12)
    expect(cleared.b).toEqual({ _ts: 12 })
    expect(suppsOf({ supplements: cleared }).map(s => s.id)).toEqual(['a'])
    expect(withSupp(undefined, 'd', null, 13)).toEqual({ d: { _ts: 13 } })
  })

  it('lists them in the order they are taken: by time, those with none last, then by name', () => {
    const supplements = {
      a: { name: 'Vitamin D', _ts: 1 },
      b: { name: 'Creatine', time: '08:00', _ts: 1 },
      c: { name: 'Zinc', time: '21:00', _ts: 1 },
      d: { name: 'Omega 3', time: '08:00', _ts: 1 },
      e: { _ts: 9 },
    }
    expect(suppsOf({ supplements }).map(s => s.name)).toEqual(['Creatine', 'Omega 3', 'Zinc', 'Vitamin D'])
    expect(suppsOf({})).toEqual([])
    expect(suppsOf(null)).toEqual([])
  })

  it('makes an id that differs by moment and is stable for a pinned clock', () => {
    expect(newSuppId(0, () => 0)).toBe('s000')
    expect(newSuppId(0, () => 0.5)).toBe('s0i0')
    expect(newSuppId(1000, () => 0.5)).not.toBe(newSuppId(2000, () => 0.5))
    expect(newSuppId()).toMatch(/^s[0-9a-z]+$/)
  })

  it('takes any real-looking day, past or future', () => {
    expect(isSuppDay('2026-10-09')).toBe(true)
    expect(isSuppDay('2030-01-01')).toBe(true)
    expect(isSuppDay('nope')).toBe(false)
    expect(isSuppDay('')).toBe(false)
    expect(isSuppDay(undefined)).toBe(false)
  })
})

describe('supplements: the daily check-off', () => {
  const list = { a: { name: 'Creatine', _ts: 1 }, b: { name: 'Zinc', _ts: 1 }, c: { name: 'Omega 3', _ts: 1 } }

  it('ticks and un-ticks one supplement on one day, as stamped entries', () => {
    const on = withTaken({}, D, 'a', true, 10)
    expect(on).toEqual({ [`${D}|a`]: { on: 1, _ts: 10 } })
    expect(takenOn({ suppLog: on }, D, 'a')).toBe(true)
    expect(takenOn({ suppLog: on }, '2026-10-02', 'a')).toBe(false)
    expect(takenOn({ suppLog: on }, D, 'b')).toBe(false)
    const off = withTaken(on, D, 'a', false, 11)
    expect(off[`${D}|a`]).toEqual({ _ts: 11 })
    expect(takenOn({ suppLog: off }, D, 'a')).toBe(false)
    expect(takenOn({}, D, 'a')).toBe(false)
  })

  it('counts the share taken on a day, and has none to count with an empty list', () => {
    let suppLog = withTaken({}, D, 'a', true, 10)
    suppLog = withTaken(suppLog, D, 'b', true, 11)
    const day = suppDay({ supplements: list, suppLog }, D)
    expect(day.total).toBe(3)
    expect(day.taken).toBe(2)
    expect(day.pct).toBe(67)
    expect(day.items.find(i => i.id === 'c').taken).toBe(false)
    const empty = suppDay({ supplements: {}, suppLog }, D)
    expect(empty).toMatchObject({ total: 0, taken: 0, pct: null })
  })

  it('ignores the ticks of a supplement that was removed', () => {
    const suppLog = withTaken(withTaken({}, D, 'a', true, 10), D, 'b', true, 11)
    const supplements = { ...list, b: { _ts: 20 } }
    const day = suppDay({ supplements, suppLog }, D)
    expect(day.total).toBe(2)
    expect(day.taken).toBe(1)
    expect(day.pct).toBe(50)
  })

  it('counts days in a row with everything taken, and lets an unfinished today wait', () => {
    const supplements = { a: { name: 'Creatine', _ts: 1 }, b: { name: 'Zinc', _ts: 1 } }
    let suppLog = {}
    for (const day of ['2026-10-07', '2026-10-08']) for (const id of ['a', 'b']) suppLog = withTaken(suppLog, day, id, true, 5)
    suppLog = withTaken(suppLog, '2026-10-05', 'a', true, 5)
    const S = { supplements, suppLog }
    expect(suppStreak(S, '2026-10-09', addDays)).toBe(2)          // today unfinished: counted from yesterday
    suppLog = withTaken(withTaken(suppLog, '2026-10-09', 'a', true, 6), '2026-10-09', 'b', true, 6)
    expect(suppStreak({ supplements, suppLog }, '2026-10-09', addDays)).toBe(3)
    expect(suppStreak({ supplements, suppLog }, '2026-10-12', addDays)).toBe(0)
    expect(suppStreak({ supplements: {}, suppLog }, '2026-10-09', addDays)).toBe(0)
  })
})

describe('supplements across devices', () => {
  it('supplements added on two devices are both kept', () => {
    const phone = base({ _ts: 100, supplements: withSupp({}, 'a', { name: 'Creatine' }, 90) })
    const desk = base({ _ts: 200, workouts: [{ id: 'w', d: '2026-10-03', start: 1, entries: [] }], supplements: withSupp({}, 'b', { name: 'Zinc' }, 20) })
    for (const m of [mergeStates(phone, desk), mergeStates(desk, phone)]) {
      expect(suppsOf(m).map(s => s.name).sort()).toEqual(['Creatine', 'Zinc'])
      expect(m.workouts.map(w => w.id)).toEqual(['w'])
    }
  })

  it('a different tick on each device on the same day keeps both', () => {
    const phone = base({ _ts: 100, suppLog: withTaken({}, D, 'a', true, 90) })
    const desk = base({ _ts: 300, suppLog: withTaken({}, D, 'b', true, 40) })
    for (const m of [mergeStates(phone, desk), mergeStates(desk, phone)]) {
      expect(takenOn(m, D, 'a')).toBe(true)
      expect(takenOn(m, D, 'b')).toBe(true)
    }
  })

  it('the same supplement keeps the edit written last, whichever copy is newer as a whole', () => {
    const phone = base({ _ts: 100, supplements: withSupp({}, 'a', { name: 'Creatine', dose: '5 g' }, 90) })
    const desk = base({ _ts: 300, supplements: withSupp({}, 'a', { name: 'Creatine', dose: '3 g' }, 40) })
    for (const m of [mergeStates(phone, desk), mergeStates(desk, phone)]) expect(suppsOf(m)[0].dose).toBe('5 g')
  })

  it('an un-ticked box stays un-ticked against the other device\'s older tick, and a later tick beats it', () => {
    const removed = base({ _ts: 100, suppLog: withTaken({}, D, 'a', false, 80) })
    const stale = base({ _ts: 300, suppLog: withTaken({}, D, 'a', true, 40) })
    for (const m of [mergeStates(removed, stale), mergeStates(stale, removed)]) expect(takenOn(m, D, 'a')).toBe(false)
    const later = base({ _ts: 50, suppLog: withTaken({}, D, 'a', true, 95) })
    expect(takenOn(mergeStates(removed, later), D, 'a')).toBe(true)
  })

  it('a removed supplement stays removed against the other device\'s older copy', () => {
    const removed = base({ _ts: 100, supplements: withSupp({}, 'a', null, 80) })
    const stale = base({ _ts: 300, supplements: withSupp({}, 'a', { name: 'Creatine' }, 40) })
    for (const m of [mergeStates(removed, stale), mergeStates(stale, removed)]) expect(suppsOf(m)).toEqual([])
  })

  it('a copy from before supplements existed loses none of them', () => {
    const mine = base({ _ts: 100, supplements: withSupp({}, 'a', { name: 'Creatine' }, 90), suppLog: withTaken({}, D, 'a', true, 90) })
    const old = base({ _ts: 500 })
    for (const m of [mergeStates(mine, old), mergeStates(old, mine)]) {
      expect(suppsOf(m).map(s => s.name)).toEqual(['Creatine'])
      expect(takenOn(m, D, 'a')).toBe(true)
    }
  })

  it('a change that ticks a box stamps it after everything the copy has seen', () => {
    const prev = base({ _ts: 1000, suppLog: withTaken({}, D, 'a', true, 900) })
    const next = clone(prev)
    next.suppLog = withTaken(next.suppLog, '2026-10-02', 'a', true, 5)   // a clock far behind
    const at = stampChange(prev, next, 5)
    expect(at).toBeGreaterThan(1000)
    expect(next.suppLog['2026-10-02|a']._ts).toBe(at)
    expect(next.suppLog[`${D}|a`]._ts).toBe(900)
    expect(highestStamp(next)).toBe(at)
  })

  it('"Reset everything" wipes the supplements and ticks of a copy that has not seen the reset', () => {
    const before = base({ _ts: 1000, supplements: withSupp({}, 'a', { name: 'Creatine' }, 900), suppLog: withTaken({}, D, 'a', true, 900) })
    const reset = base({ _ts: 2000, resetAt: 2000, resetIds: resetIdsOf(before) })
    expect(reset.resetIds.supplements).toEqual(['a'])
    expect(reset.resetIds.suppLog).toEqual([`${D}|a`])
    const stale = clone(before); stale._ts = 2100
    for (const m of [mergeStates(reset, stale), mergeStates(stale, reset)]) {
      expect(suppsOf(m)).toEqual([])
      expect(takenOn(m, D, 'a')).toBe(false)
    }
  })

  it('sign-in counts supplements the device has that the server does not', () => {
    const server = base({ supplements: withSupp({}, 'a', { name: 'Creatine' }, 5) })
    const local = base({ supplements: { ...withSupp({}, 'a', { name: 'Creatine 5 g' }, 9), ...withSupp({}, 'b', { name: 'Zinc' }, 9), c: { _ts: 9 } } })
    expect(localExtras(local, server).setup).toBe(1)
  })

  it('the server\'s sync rules know both maps: same list, same highest stamp, never stamped as a setting', () => {
    expect(Server.STAMPED_MAPS).toEqual(STAMPED_MAPS)
    expect(STAMPED_MAPS).toEqual(expect.arrayContaining(['supplements', 'suppLog']))
    const doc = { _ts: 5, supplements: { a: { name: 'Creatine', _ts: 77 } }, suppLog: { [`${D}|a`]: { on: 1, _ts: 88 } } }
    expect(Server.highestStamp(doc)).toBe(88)
    expect(highestStamp(doc)).toBe(88)
    // an older app (no stamps of its own) pushing over a copy with supplements: they come back
    // from the stored copy, and no `edited` stamp is made up for either map
    const cur = { _ts: 10, unit: 'kg', workouts: [], supplements: { a: { name: 'Creatine', _ts: 9 } }, suppLog: { [`${D}|a`]: { on: 1, _ts: 9 } } }
    const next = { _ts: 11, unit: 'kg', workouts: [], restSec: 60 }
    Server.stampPut(cur, next, { overRead: true, now: 20 })
    expect(next.supplements).toEqual(cur.supplements)
    expect(next.suppLog).toEqual(cur.suppLog)
    expect(next.edited?.supplements).toBeUndefined()
    expect(next.edited?.suppLog).toBeUndefined()
  })
})
