import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { suppsOf, suppDay, suppStreak, withSupp, withTaken, newSuppId } from '../lib/supplements.js'
import { todayISO, fmtDate, isoOf } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, TextField } from './ui.jsx'

const shiftIso = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

export default function SupplementsSheet({ iso = todayISO(), close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [day, setDay] = useState(iso)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [time, setTime] = useState('')

  const { items, taken, total, pct } = suppDay(S, day)
  const streak = suppStreak(S, day, shiftIso)

  const startEdit = supp => {
    setEditing(supp)
    setName(supp?.name || '')
    setDose(supp?.dose || '')
    setTime(supp?.time || '')
  }

  const handleToggle = (id, currentTaken) => {
    update(s => {
      s.suppLog = withTaken(s.suppLog, day, id, !currentTaken)
    })
  }

  const handleSave = () => {
    const cleanName = name.trim()
    if (!cleanName) return
    const id = editing?.id || newSuppId()
    update(s => {
      s.supplements = withSupp(s.supplements, id, {
        name: cleanName,
        dose: dose.trim(),
        time: time.trim(),
      })
    })
    toast(t('Supplement saved'))
    setEditing(null)
  }

  const handleRemove = id => {
    update(s => {
      s.supplements = withSupp(s.supplements, id, null)
    })
    toast(t('Supplement removed'))
    setEditing(null)
  }

  return (
    <>
      <h3>{t('Supplements')}</h3>

      {/* Day picker */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <button
          className="iconbtn"
          style={{ width: 32, height: 32 }}
          onClick={() => setDay(d => shiftIso(d, -1))}
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
          onClick={() => setDay(d => shiftIso(d, 1))}
          aria-label={t('Next week')}
        >
          <Icon name="chevronRight" />
        </button>
      </div>

      {/* Progress & Streak */}
      {total > 0 && (
        <div className="row between" style={{ marginBottom: 14, alignItems: 'center' }}>
          <div className="muted small">
            {pct === 100 ? (
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {t('All taken!')}</span>
            ) : (
              t('{0} of {1} taken', taken, total)
            )}
          </div>
          {streak > 0 && (
            <div className="row" style={{ gap: 4, color: 'var(--orange)', fontSize: 13, fontWeight: 500 }}>
              <Icon name="flame" style={{ fontSize: 14 }} />
              <span>{t('{0} day streak', streak)}</span>
            </div>
          )}
        </div>
      )}

      {/* Editing Form */}
      {editing ? (
        <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px' }}>{editing.id ? t('Edit supplement') : t('Add supplement')}</h4>
          <div style={{ marginBottom: 10 }}>
            <div className="muted small" style={{ marginBottom: 4 }}>{t('Supplement name')}</div>
            <TextField
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Creatine, Whey, etc."
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div className="muted small" style={{ marginBottom: 4 }}>{t('Dose (optional)')}</div>
            <TextField
              value={dose}
              onChange={e => setDose(e.target.value)}
              placeholder="5 g, 1 scoop, etc."
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="muted small" style={{ marginBottom: 4 }}>{t('Time (optional, e.g. 08:00)')}</div>
            <TextField
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="08:00"
            />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="primary" onClick={handleSave}>
              {t('Save')}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('Cancel')}
            </Button>
            {editing.id && (
              <Button
                variant="danger"
                icon="trash"
                style={{ marginInlineStart: 'auto' }}
                onClick={() => handleRemove(editing.id)}
              >
                {t('Remove')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Checklist View */
        <>
          {items.length === 0 ? (
            <div className="empty" style={{ margin: '20px 0 24px' }}>
              <div className="muted" style={{ fontWeight: 500 }}>{t('No supplements added yet.')}</div>
              <div className="muted small" style={{ marginTop: 4 }}>
                {t('Track your daily supplements and vitamins.')}
              </div>
            </div>
          ) : (
            <div className="list" style={{ marginBottom: 16 }}>
              {items.map(item => (
                <div
                  key={item.id}
                  className="item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                >
                  <button
                    className="iconbtn"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      background: item.taken ? 'var(--green)' : 'var(--surface-3)',
                      color: item.taken ? '#000' : 'var(--label-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    onClick={() => handleToggle(item.id, item.taken)}
                    aria-label={t('Mark as taken')}
                  >
                    <Icon name="check" size={18} />
                  </button>
                  <div
                    className="grow"
                    style={{ minWidth: 0, cursor: 'pointer' }}
                    onClick={() => handleToggle(item.id, item.taken)}
                  >
                    <div
                      className="tt"
                      style={{
                        textDecoration: item.taken ? 'line-through' : 'none',
                        color: item.taken ? 'var(--label-2)' : 'var(--label)',
                        fontWeight: 500,
                      }}
                    >
                      {item.name}
                    </div>
                    {(item.dose || item.time) && (
                      <div className="ss muted small" style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        {item.dose && <span>{item.dose}</span>}
                        {item.dose && item.time && <span>·</span>}
                        {item.time && <span>{item.time}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    className="iconbtn"
                    style={{ width: 32, height: 32, color: 'var(--label-2)', flexShrink: 0 }}
                    onClick={() => startEdit(item)}
                    aria-label={t('Edit supplement')}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="primary"
            icon="plus"
            onClick={() => startEdit({ id: null, name: '', dose: '', time: '' })}
          >
            {t('Add supplement')}
          </Button>
        </>
      )}
    </>
  )
}
