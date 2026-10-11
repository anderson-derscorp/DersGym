// Daily wellness log: water, sleep, mood, energy, cardio, and day notes.
// Stored per day in a stamped map, merged across devices key by key (lib/sync-merge.js STAMPED_MAPS):
//
//   S.dailyLogs = { '2026-10-10': { water: 2.5, sleep: 7.5, mood: 4, energy: 4, cardioMin: 30, notes: 'Felt strong', _ts }, … }
//
// Each entry carries the time it was last written, so two devices that each log a different day keep
// both, and the later edit of the same day wins (mergeStampedMap). Taking an entry away is a stamped
// empty entry (`{ _ts }`), not a deleted key (same rule as lib/day-notes.js and lib/supplements.js).

export const DAILY_LOG_NOTE_MAX = 500
export const MOOD_LEVELS = [1, 2, 3, 4, 5]
export const MOOD_LABELS = { 1: 'Awful', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'Great' }
export const ENERGY_LABELS = { 1: 'Drained', 2: 'Low', 3: 'Normal', 4: 'High', 5: 'Charged' }

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const ISO = /^\d{4}-\d{2}-\d{2}$/

export const isDailyLogDay = iso => ISO.test(String(iso || ''))

/**
 * Validates and sanitizes a daily log entry: { water, sleep, mood, energy, cardioMin, notes }
 * Returns null if the entry is empty/junk, or an object with the clean values.
 */
export function readDailyLog(entry) {
  if (!isMap(entry)) return null

  const water = typeof entry.water === 'number' && entry.water > 0 ? Math.min(20, Math.round(entry.water * 10) / 10) : null
  const sleep = typeof entry.sleep === 'number' && entry.sleep > 0 && entry.sleep <= 24 ? Math.round(entry.sleep * 10) / 10 : null
  const mood = Number.isInteger(entry.mood) && entry.mood >= 1 && entry.mood <= 5 ? entry.mood : null
  const energy = Number.isInteger(entry.energy) && entry.energy >= 1 && entry.energy <= 5 ? entry.energy : null
  const cardioMin = Number.isInteger(entry.cardioMin) && entry.cardioMin > 0 ? Math.min(600, entry.cardioMin) : null
  const notes = typeof entry.notes === 'string' ? entry.notes.trim().slice(0, DAILY_LOG_NOTE_MAX) : ''

  if (water == null && sleep == null && mood == null && energy == null && cardioMin == null && !notes) {
    return null
  }

  return {
    ...(water != null ? { water } : {}),
    ...(sleep != null ? { sleep } : {}),
    ...(mood != null ? { mood } : {}),
    ...(energy != null ? { energy } : {}),
    ...(cardioMin != null ? { cardioMin } : {}),
    ...(notes ? { notes } : {}),
  }
}

/** The clean daily log of `iso`, or null. */
export const dailyLogOf = (S, iso) => readDailyLog(isMap(S?.dailyLogs) ? S.dailyLogs[iso] : null)

/**
 * S.dailyLogs with `iso` set to `data`, stamped `now`. Empty data is written as a stamped clear
 * so the removal syncs across devices.
 */
export function withDailyLog(map, iso, data, now = Date.now()) {
  const clean = readDailyLog(data)
  const entry = clean ? { ...clean, _ts: now } : { _ts: now }
  return { ...(isMap(map) ? map : {}), [iso]: entry }
}

/**
 * Computes an overall daily adherence / wellness score (0-100) based on logged habits:
 * - Water: up to 25 pts (>= 3.0L: 25, >= 2.0L: 18, >= 1.0L: 10)
 * - Sleep: up to 25 pts (>= 7.5h: 25, >= 6.5h: 18, >= 5.0h: 10)
 * - Energy: up to 20 pts (energy/5 * 20)
 * - Mood: up to 15 pts (mood/5 * 15)
 * - Workout / Cardio: up to 15 pts (workout: 10, cardio: 5)
 */
export function dailyLogScore(log, hasWorkout = false) {
  if (!log) return hasWorkout ? 10 : null

  let pts = 0
  let components = 0

  if (log.water != null) {
    components++
    if (log.water >= 3.0) pts += 25
    else if (log.water >= 2.0) pts += 18
    else if (log.water >= 1.0) pts += 10
  }

  if (log.sleep != null) {
    components++
    if (log.sleep >= 7.5) pts += 25
    else if (log.sleep >= 6.5) pts += 18
    else if (log.sleep >= 5.0) pts += 10
  }

  if (log.energy != null) {
    components++
    pts += Math.round((log.energy / 5) * 20)
  }

  if (log.mood != null) {
    components++
    pts += Math.round((log.mood / 5) * 15)
  }

  if (hasWorkout || log.cardioMin) {
    components++
    if (hasWorkout) pts += 10
    if (log.cardioMin) pts += 5
  }

  if (components === 0) return null
  return Math.min(100, Math.max(0, pts))
}
