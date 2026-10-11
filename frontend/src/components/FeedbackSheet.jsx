import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  feedbacksOf,
  withFeedback,
  feedbackDeltas,
  isDueForFeedback,
  newFeedbackId,
  daysBetween,
} from '../lib/feedbacks.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, TextField } from './ui.jsx'

function RatingRow({ label, value, onChange, lowLabel = '1', highLabel = '10' }) {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row between" style={{ marginBottom: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: value ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          {value ? `${value}/10` : '—'}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 3,
        }}
      >
        {levels.map(n => {
          const isSelected = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(isSelected ? null : n)}
              style={{
                height: 28,
                borderRadius: 4,
                border: isSelected ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                color: isSelected ? '#fff' : 'inherit',
                fontSize: 11,
                fontWeight: isSelected ? 700 : 400,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="row between" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

function DeltaBadge({ label, val, unit = '', invert = false }) {
  if (val == null || val === 0) return null
  const isPositive = val > 0
  // For weight, bodyFat, waist, hip, thigh: negative is usually "progress" (green), positive red/neutral
  const isGood = invert ? !isPositive : isPositive
  const color = isGood ? 'var(--green, #22c55e)' : 'var(--orange, #f59e0b)'
  const sign = isPositive ? '+' : ''
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${color}`,
        color,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {label}: {sign}{val}{unit}
    </span>
  )
}

export default function FeedbackSheet({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const feedbacks = feedbacksOf(S)
  const latest = feedbacks[0] || null
  const previous = feedbacks[1] || null
  const isDue = isDueForFeedback(S, todayISO())

  const [mode, setMode] = useState(feedbacks.length === 0 ? 'new' : 'view')

  // New feedback form state
  const [date, setDate] = useState(todayISO())
  const [bw, setBw] = useState(latest?.bw ? String(latest.bw) : '')
  const [bodyFat, setBodyFat] = useState(latest?.bodyFat ? String(latest.bodyFat) : '')
  const [waist, setWaist] = useState(latest?.waist ? String(latest.waist) : '')
  const [hip, setHip] = useState(latest?.hip ? String(latest.hip) : '')
  const [arm, setArm] = useState(latest?.arm ? String(latest.arm) : '')
  const [thigh, setThigh] = useState(latest?.thigh ? String(latest.thigh) : '')

  const [mood, setMood] = useState(null)
  const [energy, setEnergy] = useState(null)
  const [motivation, setMotivation] = useState(null)
  const [stress, setStress] = useState(null)

  const [wins, setWins] = useState('')
  const [struggles, setStruggles] = useState('')
  const [notes, setNotes] = useState('')

  const handleSave = () => {
    const id = newFeedbackId()
    const entryData = {
      d: date,
      bw: bw ? Number(bw) : null,
      bodyFat: bodyFat ? Number(bodyFat) : null,
      waist: waist ? Number(waist) : null,
      hip: hip ? Number(hip) : null,
      arm: arm ? Number(arm) : null,
      thigh: thigh ? Number(thigh) : null,
      mood,
      energy,
      motivation,
      stress,
      wins,
      struggles,
      notes,
    }

    update(s => {
      // 1. Update feedbacks map
      s.feedbacks = withFeedback(s.feedbacks, id, entryData)

      // 2. Automatically update bodyweight history if weight was provided
      if (entryData.bw) {
        const existingBw = (s.bodyweight || []).find(b => b.d === date)
        if (existingBw) {
          existingBw.w = entryData.bw
          existingBw.t = Date.now()
        } else {
          s.bodyweight = [...(s.bodyweight || []), { d: date, t: Date.now(), w: entryData.bw }]
            .sort((a, b) => a.d.localeCompare(b.d))
        }
      }

      // 3. Automatically update measurements history if circumferences provided
      const hasMeas = entryData.waist || entryData.hip || entryData.arm || entryData.thigh || entryData.bodyFat
      if (hasMeas) {
        const existingM = (s.measurements || []).find(m => m.d === date)
        const mEntry = existingM ? { ...existingM } : { d: date, t: Date.now() }
        if (entryData.waist != null) mEntry.waist = entryData.waist
        if (entryData.hip != null) mEntry.hips = entryData.hip
        if (entryData.arm != null) {
          mEntry.upperArmRight = entryData.arm
          mEntry.upperArmLeft = entryData.arm
        }
        if (entryData.thigh != null) {
          mEntry.thighRight = entryData.thigh
          mEntry.thighLeft = entryData.thigh
        }
        if (entryData.bodyFat != null) mEntry.bodyFat = entryData.bodyFat

        if (existingM) {
          s.measurements = s.measurements.map(m => (m.d === date ? mEntry : m))
        } else {
          s.measurements = [...(s.measurements || []), mEntry].sort((a, b) => a.d.localeCompare(b.d))
        }
      }
    })

    toast(t('Biweekly feedback saved'))
    setMode('view')
  }

  const handleDelete = id => {
    if (!confirm(t('Remove this feedback?'))) return
    update(s => {
      s.feedbacks = withFeedback(s.feedbacks, id, null)
    })
    toast(t('Feedback removed'))
  }

  const deltas = latest && previous ? feedbackDeltas(latest, previous) : null

  return (
    <>
      <div className="row between" style={{ alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t('Biweekly check-in')}</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {isDue ? t('Time for your 15-day review!') : t('15-day progress & wellness reflection')}
          </div>
        </div>
        {mode === 'view' ? (
          <Button size="sm" className="btn-primary" onClick={() => setMode('new')}>
            <Icon name="plus" />
            <span style={{ marginLeft: 4 }}>{t('New check-in')}</span>
          </Button>
        ) : (
          feedbacks.length > 0 && (
            <Button size="sm" className="btn-ghost" onClick={() => setMode('view')}>
              {t('Cancel')}
            </Button>
          )
        )}
      </div>

      {mode === 'new' ? (
        /* Form view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date Picker */}
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('Check-in date')}</div>
            <input
              type="date"
              className="input"
              value={date}
              max={todayISO()}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', height: 38 }}
            />
          </div>

          {/* Measurements */}
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="scale" size={16} />
              {t('Body measurements')}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <TextField
                label={t('Weight ({0})', S.unit || 'kg')}
                type="number"
                step="0.1"
                placeholder={latest?.bw ? `ex: ${latest.bw}` : 'ex: 82.5'}
                value={bw}
                onChange={e => setBw(e.target.value)}
              />
              <TextField
                label={t('Body fat (%)')}
                type="number"
                step="0.1"
                placeholder={latest?.bodyFat ? `ex: ${latest.bodyFat}` : 'ex: 18.0'}
                value={bodyFat}
                onChange={e => setBodyFat(e.target.value)}
              />
              <TextField
                label={t('Waist (cm)')}
                type="number"
                step="0.5"
                placeholder={latest?.waist ? `ex: ${latest.waist}` : 'ex: 85'}
                value={waist}
                onChange={e => setWaist(e.target.value)}
              />
              <TextField
                label={t('Hips (cm)')}
                type="number"
                step="0.5"
                placeholder={latest?.hip ? `ex: ${latest.hip}` : 'ex: 100'}
                value={hip}
                onChange={e => setHip(e.target.value)}
              />
              <TextField
                label={t('Arm (cm)')}
                type="number"
                step="0.5"
                placeholder={latest?.arm ? `ex: ${latest.arm}` : 'ex: 36'}
                value={arm}
                onChange={e => setArm(e.target.value)}
              />
              <TextField
                label={t('Thigh (cm)')}
                type="number"
                step="0.5"
                placeholder={latest?.thigh ? `ex: ${latest.thigh}` : 'ex: 59'}
                value={thigh}
                onChange={e => setThigh(e.target.value)}
              />
            </div>
          </div>

          {/* Subjective Wellness ratings */}
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="heart" size={16} />
              {t('Wellness & energy ratings (1-10)')}
            </h4>
            <RatingRow label={t('Mood / Humor')} value={mood} onChange={setMood} lowLabel={t('Low')} highLabel={t('High')} />
            <RatingRow label={t('Energy level')} value={energy} onChange={setEnergy} lowLabel={t('Drained')} highLabel={t('Charged')} />
            <RatingRow label={t('Motivation & focus')} value={motivation} onChange={setMotivation} lowLabel={t('Low')} highLabel={t('High')} />
            <RatingRow label={t('Stress level')} value={stress} onChange={setStress} lowLabel={t('Relaxed')} highLabel={t('Overwhelmed')} />
          </div>

          {/* Reflection */}
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkles" size={16} />
              {t('Reflection & wins')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('Fortnight wins (what went well)')}</div>
                <textarea
                  className="input"
                  rows={2}
                  value={wins}
                  onChange={e => setWins(e.target.value)}
                  placeholder={t('e.g. Completed all 4 workout days, kept creatine consistent')}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('Challenges & difficulties')}</div>
                <textarea
                  className="input"
                  rows={2}
                  value={struggles}
                  onChange={e => setStruggles(e.target.value)}
                  placeholder={t('e.g. Afternoon sweet cravings, missed water target on Thursday')}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('Next fortnight adjustments & notes')}</div>
                <textarea
                  className="input"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('e.g. Increase bench press weight, sleep before midnight')}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <Button className="btn-primary" onClick={handleSave} style={{ width: '100%', justifyContent: 'center' }}>
            <Icon name="check" />
            <span style={{ marginLeft: 6 }}>{t('Save biweekly feedback')}</span>
          </Button>
        </div>
      ) : (
        /* History & Summary view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {latest && (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'var(--bg-card, rgba(255,255,255,0.04))',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
              }}
            >
              <div className="row between" style={{ alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('Latest check-in')}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {fmtDate(latest.d, true)}
                  </div>
                </div>
                {previous && (
                  <span className="tag" style={{ fontSize: 11 }}>
                    {daysBetween(previous.d, latest.d)} {t('days since previous')}
                  </span>
                )}
              </div>

              {/* Measurements grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {latest.bw != null && (
                  <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('Weight')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{latest.bw} {S.unit || 'kg'}</div>
                  </div>
                )}
                {latest.bodyFat != null && (
                  <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('Body fat')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{latest.bodyFat}%</div>
                  </div>
                )}
                {latest.waist != null && (
                  <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('Waist')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{latest.waist} cm</div>
                  </div>
                )}
                {latest.hip != null && (
                  <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('Hips')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{latest.hip} cm</div>
                  </div>
                )}
                {latest.arm != null && (
                  <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('Arm')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{latest.arm} cm</div>
                  </div>
                )}
                {latest.thigh != null && (
                  <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('Thigh')}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{latest.thigh} cm</div>
                  </div>
                )}
              </div>

              {/* Deltas vs previous */}
              {deltas && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <DeltaBadge label={t('Weight')} val={deltas.bw} unit={S.unit || 'kg'} invert />
                  <DeltaBadge label={t('Fat')} val={deltas.bodyFat} unit="%" invert />
                  <DeltaBadge label={t('Waist')} val={deltas.waist} unit="cm" invert />
                  <DeltaBadge label={t('Hips')} val={deltas.hip} unit="cm" invert />
                  <DeltaBadge label={t('Arm')} val={deltas.arm} unit="cm" />
                  <DeltaBadge label={t('Thigh')} val={deltas.thigh} unit="cm" />
                </div>
              )}

              {/* Subjective wellness badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t('Mood')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{latest.mood ? `${latest.mood}/10` : '—'}</div>
                </div>
                <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t('Energy')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{latest.energy ? `${latest.energy}/10` : '—'}</div>
                </div>
                <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t('Focus')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{latest.motivation ? `${latest.motivation}/10` : '—'}</div>
                </div>
                <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t('Stress')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{latest.stress ? `${latest.stress}/10` : '—'}</div>
                </div>
              </div>

              {/* Reflection texts */}
              {latest.wins && (
                <div style={{ marginBottom: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--green, #22c55e)' }}>{t('Wins')}: </span>
                  <span style={{ color: 'var(--fg)' }}>{latest.wins}</span>
                </div>
              )}
              {latest.struggles && (
                <div style={{ marginBottom: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--orange, #f59e0b)' }}>{t('Challenges')}: </span>
                  <span style={{ color: 'var(--fg)' }}>{latest.struggles}</span>
                </div>
              )}
              {latest.notes && (
                <div style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{t('Notes')}: </span>
                  <span style={{ color: 'var(--fg)' }}>{latest.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Past check-ins list */}
          {feedbacks.length > 1 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('Previous check-ins')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {feedbacks.slice(1).map(fb => (
                  <div
                    key={fb.id}
                    className="row between"
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtDate(fb.d, true)}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {fb.bw && `${fb.bw} ${S.unit || 'kg'} · `}
                        {fb.mood && `${t('Mood')}: ${fb.mood}/10`}
                      </div>
                    </div>
                    <button
                      className="iconbtn"
                      style={{ width: 26, height: 26, color: 'var(--muted)' }}
                      onClick={() => handleDelete(fb.id)}
                      aria-label={t('Delete')}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Button onClick={close} style={{ width: '100%', justifyContent: 'center' }}>
          {t('Close')}
        </Button>
      </div>
    </>
  )
}
