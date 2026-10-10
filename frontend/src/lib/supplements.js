// Supplements: the ones you take (creatine, vitamin D, …) and a tick for each one you took on a day.
// Two stamped maps, merged across devices key by key (lib/sync-merge.js STAMPED_MAPS):
//
//   S.supplements = { 's1a2b': { name: 'Creatine', dose: '5 g', time: '08:00', _ts }, … }
//   S.suppLog     = { '2026-10-08|s1a2b': { on: 1, _ts }, … }
//
// Each entry carries the time it was last written, so two devices that each add a supplement keep
// both, and two devices that each tick a different one on the same day keep both ticks: the log is
// keyed by day AND supplement, not by day, for exactly that reason. Taking something away is a
// stamped empty entry (`{ _ts }`), not a deleted key: a delete would come straight back from the
// other device's copy on the next sync (same rule as lib/day-notes.js).
//
// A supplement that was removed keeps its old ticks in the log, harmlessly: suppDay() only reads
// the ticks of supplements that still exist.

export const SUPP_NAME_MAX = 40
export const SUPP_DOSE_MAX = 40

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const ISO = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** Whether `iso` is a real-looking calendar day ('YYYY-MM-DD'). Any day can be ticked, past or future. */
export const isSuppDay = iso => ISO.test(String(iso || ''))

/** A stored supplement read back: { name, dose, time } with the junk left out, or null for none or a cleared one. */
export function readSupp(entry) {
  if (!isMap(entry)) return null
  const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, SUPP_NAME_MAX) : ''
  if (!name) return null
  const dose = typeof entry.dose === 'string' ? entry.dose.trim().slice(0, SUPP_DOSE_MAX) : ''
  const time = typeof entry.time === 'string' && HHMM.test(entry.time) ? entry.time : ''
  return { name, dose, time }
}

/** A new id for a supplement. `now` and `rnd` are parameters so a test can pin them. */
export const newSuppId = (now = Date.now(), rnd = Math.random) => 's' + now.toString(36) + Math.floor(rnd() * 1296).toString(36).padStart(2, '0')

/**
 * The supplements still in the list, in the order they are taken: by time of day (those with no
 * time last), then by name.
 */
export function suppsOf(S) {
  const map = isMap(S?.supplements) ? S.supplements : {}
  return Object.entries(map)
    .map(([id, e]) => { const s = readSupp(e); return s ? { id, ...s } : null })
    .filter(Boolean)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.name.localeCompare(b.name))
}

/**
 * S.supplements with `id` set to `fields` ({ name, dose, time }), stamped `now`. An empty name is
 * written as a cleared entry, so the removal syncs (see the top of this file).
 */
export function withSupp(map, id, fields, now = Date.now()) {
  const clean = readSupp(fields)
  const entry = clean
    ? { name: clean.name, ...(clean.dose ? { dose: clean.dose } : {}), ...(clean.time ? { time: clean.time } : {}), _ts: now }
    : { _ts: now }
  return { ...(isMap(map) ? map : {}), [id]: entry }
}

const logKey = (iso, id) => `${iso}|${id}`

/** Whether `id` is ticked on `iso`. */
export const takenOn = (S, iso, id) => {
  const e = isMap(S?.suppLog) ? S.suppLog[logKey(iso, id)] : null
  return isMap(e) && e.on === 1
}

/** S.suppLog with `id` ticked (or un-ticked) on `iso`, stamped `now`. Un-ticking is a stamped clear. */
export function withTaken(log, iso, id, on, now = Date.now()) {
  return { ...(isMap(log) ? log : {}), [logKey(iso, id)]: on ? { on: 1, _ts: now } : { _ts: now } }
}

/** One day's checklist: every supplement with whether it was taken, and the share taken (0-100, or null with none). */
export function suppDay(S, iso) {
  const items = suppsOf(S).map(s => ({ ...s, taken: takenOn(S, iso, s.id) }))
  const taken = items.filter(i => i.taken).length
  return { items, taken, total: items.length, pct: items.length ? Math.round((taken / items.length) * 100) : null }
}

/**
 * Days in a row, ending on `today` (or yesterday, while today is not finished), on which every
 * supplement was taken. A day with nothing in the list never counts.
 */
export function suppStreak(S, today, addDays) {
  if (!suppsOf(S).length) return 0
  let iso = today
  if (suppDay(S, iso).pct !== 100) iso = addDays(iso, -1)
  let n = 0
  while (suppDay(S, iso).pct === 100) { n++; iso = addDays(iso, -1) }
  return n
}
