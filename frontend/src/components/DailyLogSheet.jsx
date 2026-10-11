import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  dailyLogOf,
  dailyLogScore,
  withDailyLog,
  MOOD_LEVELS,
  MOOD_LABELS,
  ENERGY_LABELS,
} from '../lib/daily-log.js'
import { workoutDay } from '../lib/history.js'
import { todayISO, fmtDate, isoOf } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, Stepper, TextArea } from './ui.jsx'

const shiftIso = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

export default function DailyLogSheet({ iso = todayISO(), close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [day, setDay] = useState(iso)
  const log = dailyLogOf(S, day)

  const [water, setWater] = useState(log?.water ?? 0)
  const [sleep, setSleep] = useState(log?.sleep ?? 0)
  const [mood, setMood] = useState(log?.mood ?? null)
  const [energy, setEnergy] = useState(log?.energy ?? null)
  const [cardioMin, setCardioMin] = useState(log?.cardioMin ?? 0)
  const [notes, setNotes] = useState(log?.notes ?? '')

  // Update form inputs when day changes
  const changeDay = newDay => {
    setDay(newDay)
    const newLog = dailyLogOf(S, newDay)
    setWater(newLog?.water ?? 0)
    setSleep(newLog?.sleep ?? 0)
    setMood(newLog?.mood ?? null)
    setEnergy(newLog?.energy ?? null)
    setCardioMin(newLog?.cardioMin ?? 0)
    setNotes(newLog?.notes ?? '')
  }

  const hasWorkout = S.workouts?.some(w => workoutDay(w) === day) ?? false
  const score = dailyLogScore(
    {
      water: water > 0 ? water : null,
      sleep: sleep > 0 ? sleep : null,
      mood,
      energy,
      cardioMin: cardioMin > 0 ? cardioMin : null,
    },
    hasWorkout
  )

  const handleSave = () => {
    const payload = {
      water: water > 0 ? water : null,
      sleep: sleep > 0 ? sleep : null,
      mood: mood ?? null,
      energy: energy ?? null,
      cardioMin: cardioMin > 0 ? cardioMin : null,
      notes: notes.trim(),
    }

    update(s => {
      s.dailyLogs = withDailyLog(s.dailyLogs, day, payload)
    })
    toast(t('Daily log saved'))
    if (close) close()
  }

  const handleClear = () => {
    update(s => {
      s.dailyLogs = withDailyLog(s.dailyLogs, day, null)
    })
    toast(t('Daily log removed'))
    if (close) close()
  }

  return (
    <>
      <h3>{t('Daily log')}</h3>

      {/* Day picker */}
      <div className="row between" style={{ marginBottom: 14 }}>
        <button
          className="iconbtn"
          style={{ width: 32, height: 32 }}
          onClick={() => changeDay(shiftIso(day, -1))}
          aria-label={t('Previous week')}
        >
          <Icon name="chevronLeft" />
        </button>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>{fmtDate(day, true)}</span>
          {day === todayISO() && (
            <span className="tag acc" style={{ fontSize: 11, padding: '2px 6px' }}>
              {t('Today')}
            </span>
          )}
        </div>
        <button
          className="iconbtn"
          style={{ width: 32, height: 32 }}
          onClick={() => changeDay(shiftIso(day, 1))}
          aria-label={t('Next week')}
        >
          <Icon name="chevronRight" />
        </button>
      </div>

      {/* Adherence Score / Workout Status */}
      {(score != null || hasWorkout) && (
        <div
          className="row between"
          style={{
            background: 'var(--surface-2)',
            padding: '10px 14px',
            borderRadius: 12,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <div>
            {score != null ? (
              <span style={{ fontWeight: 600, fontSize: 15 }}>{t('Daily score: {0}%', score)}</span>
            ) : (
              <span className="muted small">{t('Log water, sleep, mood, energy and cardio.')}</span>
            )}
          </div>
          {hasWorkout && (
            <span
              className="tag"
              style={{ color: 'var(--green)', background: 'color-mix(in srgb,var(--green) 16%,transparent)' }}
            >
              Workout ✓
            </span>
          )}
        </div>
      )}

      {/* Water & Sleep inputs */}
      <div className="row between" style={{ gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>{t('Water (L)')}</div>
          <Stepper
            value={water}
            step={0.25}
            min={0}
            max={15}
            decimal={true}
            unit="L"
            onChange={v => setWater(v)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>{t('Sleep (hours)')}</div>
          <Stepper
            value={sleep}
            step={0.5}
            min={0}
            max={24}
            decimal={true}
            unit="h"
            onChange={v => setSleep(v)}
          />
        </div>
      </div>

      {/* Cardio input */}
      <div style={{ marginBottom: 14 }}>
        <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>{t('Cardio (minutes)')}</div>
        <Stepper
          value={cardioMin}
          step={5}
          min={0}
          max={300}
          decimal={false}
          unit="min"
          onChange={v => setCardioMin(v)}
        />
      </div>

      {/* Mood chips */}
      <div style={{ marginBottom: 14 }}>
        <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>{t('Mood')}</div>
        <div className="chips" style={{ margin: 0 }}>
          {MOOD_LEVELS.map(lvl => (
            <button
              key={lvl}
              type="button"
              className={'chip nocap' + (mood === lvl ? ' on' : '')}
              aria-pressed={mood === lvl}
              onClick={() => setMood(mood === lvl ? null : lvl)}
            >
              {lvl} · {t(MOOD_LABELS[lvl])}
            </button>
          ))}
        </div>
      </div>

      {/* Energy chips */}
      <div style={{ marginBottom: 14 }}>
        <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>{t('Energy')}</div>
        <div className="chips" style={{ margin: 0 }}>
          {MOOD_LEVELS.map(lvl => (
            <button
              key={lvl}
              type="button"
              className={'chip nocap' + (energy === lvl ? ' on' : '')}
              aria-pressed={energy === lvl}
              onClick={() => setEnergy(energy === lvl ? null : lvl)}
            >
              {lvl} · {t(ENERGY_LABELS[lvl])}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 18 }}>
        <div className="muted small" style={{ marginBottom: 6, fontWeight: 500 }}>{t('Notes')}</div>
        <TextArea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder={t('Anything else? (optional)')}
        />
      </div>

      {/* Actions */}
      <div className="row" style={{ gap: 10 }}>
        <Button variant="primary" onClick={handleSave}>
          {t('Save')}
        </Button>
        {log && (
          <Button variant="ghost" className="dim" onClick={handleClear}>
            {t('Clear log')}
          </Button>
        )}
      </div>
    </>
  )
}
