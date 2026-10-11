// Biweekly Check-in / Feedback Quinzenal:
// Subjective wellness ratings (mood, energy, motivation, stress), body measurements
// (weight, body fat %, waist, hip, arm, thigh), wins and reflection notes.
//
// Stored in a stamped map merged across devices key by key (lib/sync-merge.js STAMPED_MAPS):
//   S.feedbacks = {
//     'fb1a2b': {
//       id: 'fb1a2b',
//       d: '2026-10-10',
//       bw: 82.5,
//       bodyFat: 17.5,
//       waist: 84,
//       hip: 98,
//       arm: 36,
//       thigh: 59,
//       mood: 8,
//       energy: 7,
//       motivation: 9,
//       stress: 4,
//       wins: 'Consistency on evening workouts',
//       struggles: 'Hydration during busy afternoons',
//       notes: 'Ready to increase weights next week',
//       _ts: 1775865600000,
//     }
//   }

export const FEEDBACK_TEXT_MAX = 500

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const ISO = /^\d{4}-\d{2}-\d{2}$/

export const isFeedbackDay = iso => ISO.test(String(iso || ''))

export const newFeedbackId = (now = Date.now(), rnd = Math.random) =>
  'fb' + now.toString(36) + Math.floor(rnd() * 1296).toString(36).padStart(2, '0')

const clampNum = (val, min = 0, max = 999) => {
  if (val == null || val === '') return null
  const n = Number(val)
  if (isNaN(n) || n < min || n > max) return null
  return Math.round(n * 10) / 10
}

const clampRating = val => {
  if (val == null || val === '') return null
  const n = Number(val)
  if (isNaN(n) || n < 1 || n > 10) return null
  return Math.round(n)
}

const cleanText = text => (typeof text === 'string' ? text.trim().slice(0, FEEDBACK_TEXT_MAX) : '')

/** Validates and cleans a feedback entry. Returns null if invalid or cleared. */
export function readFeedback(entry) {
  if (!isMap(entry)) return null
  const d = typeof entry.d === 'string' && ISO.test(entry.d) ? entry.d : ''
  if (!d) return null

  const bw = clampNum(entry.bw, 20, 500)
  const bodyFat = clampNum(entry.bodyFat, 1, 90)
  const waist = clampNum(entry.waist, 20, 300)
  const hip = clampNum(entry.hip, 20, 300)
  const arm = clampNum(entry.arm, 10, 100)
  const thigh = clampNum(entry.thigh, 15, 150)

  const mood = clampRating(entry.mood)
  const energy = clampRating(entry.energy)
  const motivation = clampRating(entry.motivation)
  const stress = clampRating(entry.stress)

  const wins = cleanText(entry.wins)
  const struggles = cleanText(entry.struggles)
  const notes = cleanText(entry.notes)

  return {
    d,
    ...(bw != null ? { bw } : {}),
    ...(bodyFat != null ? { bodyFat } : {}),
    ...(waist != null ? { waist } : {}),
    ...(hip != null ? { hip } : {}),
    ...(arm != null ? { arm } : {}),
    ...(thigh != null ? { thigh } : {}),
    ...(mood != null ? { mood } : {}),
    ...(energy != null ? { energy } : {}),
    ...(motivation != null ? { motivation } : {}),
    ...(stress != null ? { stress } : {}),
    ...(wins ? { wins } : {}),
    ...(struggles ? { struggles } : {}),
    ...(notes ? { notes } : {}),
  }
}

/** Returns all feedbacks from S.feedbacks sorted newest first by date and _ts. */
export function feedbacksOf(S) {
  const map = isMap(S?.feedbacks) ? S.feedbacks : {}
  return Object.entries(map)
    .map(([id, entry]) => {
      const fb = readFeedback(entry)
      return fb ? { id, _ts: entry._ts || 0, ...fb } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.d.localeCompare(a.d) || (b._ts || 0) - (a._ts || 0))
}

/** Stamped update for a feedback in S.feedbacks. Pass null to mark as deleted. */
export function withFeedback(map, id, fields, now = Date.now()) {
  const clean = readFeedback(fields)
  const entry = clean ? { ...clean, id, _ts: now } : { _ts: now }
  return { ...(isMap(map) ? map : {}), [id]: entry }
}

/** Returns the most recent feedback entry or null. */
export function latestFeedback(S) {
  const list = feedbacksOf(S)
  return list[0] || null
}

/** Calculates differences (current - previous) between two feedbacks. */
export function feedbackDeltas(current, previous) {
  if (!current || !previous) return null

  const diff = (a, b) => (a != null && b != null ? Math.round((a - b) * 10) / 10 : null)

  return {
    bw: diff(current.bw, previous.bw),
    bodyFat: diff(current.bodyFat, previous.bodyFat),
    waist: diff(current.waist, previous.waist),
    hip: diff(current.hip, previous.hip),
    arm: diff(current.arm, previous.arm),
    thigh: diff(current.thigh, previous.thigh),
    mood: diff(current.mood, previous.mood),
    energy: diff(current.energy, previous.energy),
    motivation: diff(current.motivation, previous.motivation),
    stress: diff(current.stress, previous.stress),
  }
}

/** Days between two ISO dates. */
export function daysBetween(isoA, isoB) {
  if (!ISO.test(isoA || '') || !ISO.test(isoB || '')) return null
  const msA = new Date(isoA + 'T12:00:00').getTime()
  const msB = new Date(isoB + 'T12:00:00').getTime()
  return Math.round(Math.abs(msB - msA) / 86400000)
}

/** Whether the user is due for a new biweekly feedback (14+ days since last, or never). */
export function isDueForFeedback(S, today) {
  const latest = latestFeedback(S)
  if (!latest) return true
  const days = daysBetween(latest.d, today)
  return days == null || days >= 14
}
