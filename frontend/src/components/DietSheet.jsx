import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  mealsOf,
  dietDay,
  withDietMeal,
  withDietMealItem,
  withoutDietMealItem,
  withDietItemChecked,
  withMealChecked,
  buildStarterDietMap,
  newDietMealId,
  newDietItemId,
} from '../lib/diet.js'
import { todayISO, fmtDate, isoOf } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, TextField } from './ui.jsx'

const shiftIso = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

export default function DietSheet({ iso = todayISO(), close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [day, setDay] = useState(iso)
  const [editMode, setEditMode] = useState(false)

  // Meal creation form state
  const [addingMeal, setAddingMeal] = useState(false)
  const [newMealTitle, setNewMealTitle] = useState('')
  const [newMealTime, setNewMealTime] = useState('')
  const [newMealOptional, setNewMealOptional] = useState(false)
  const [newMealNote, setNewMealNote] = useState('')

  // Item creation form state (per meal)
  const [addingItemFor, setAddingItemFor] = useState(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemCals, setNewItemCals] = useState('')
  const [newItemP, setNewItemP] = useState('')
  const [newItemC, setNewItemC] = useState('')
  const [newItemF, setNewItemF] = useState('')

  const { meals, totalItems, checkedItems, pct, planned, consumed } = dietDay(S, day)

  const handleToggleItem = itemId => {
    const isCurrentlyChecked = meals
      .flatMap(m => m.items)
      .find(it => it.id === itemId)?.checked

    update(s => {
      s.dietLog = withDietItemChecked(s.dietLog, day, itemId, !isCurrentlyChecked)
    })
  }

  const handleToggleMeal = meal => {
    const nextState = !meal.allChecked
    update(s => {
      s.dietLog = withMealChecked(s.dietLog, day, meal, nextState)
    })
  }

  const handleAddMeal = () => {
    const title = newMealTitle.trim()
    if (!title) return
    const id = newDietMealId()
    update(s => {
      s.dietMeals = withDietMeal(s.dietMeals, id, {
        title,
        time: newMealTime.trim(),
        optional: newMealOptional,
        note: newMealNote.trim(),
        items: [],
      })
    })
    setNewMealTitle('')
    setNewMealTime('')
    setNewMealOptional(false)
    setNewMealNote('')
    setAddingMeal(false)
    toast(t('Meal added'))
  }

  const handleDeleteMeal = id => {
    if (!confirm(t('Remove this meal?'))) return
    update(s => {
      s.dietMeals = withDietMeal(s.dietMeals, id, null)
    })
    toast(t('Meal removed'))
  }

  const handleAddItem = mealId => {
    const name = newItemName.trim()
    if (!name) return
    const item = {
      id: newDietItemId(),
      name,
      qty: newItemQty.trim(),
      cals: Number(newItemCals) || 0,
      p: Number(newItemP) || 0,
      c: Number(newItemC) || 0,
      f: Number(newItemF) || 0,
    }
    update(s => {
      s.dietMeals = withDietMealItem(s.dietMeals, mealId, item)
    })
    setNewItemName('')
    setNewItemQty('')
    setNewItemCals('')
    setNewItemP('')
    setNewItemC('')
    setNewItemF('')
    setAddingItemFor(null)
    toast(t('Item added'))
  }

  const handleDeleteItem = (mealId, itemId) => {
    update(s => {
      s.dietMeals = withoutDietMealItem(s.dietMeals, mealId, itemId)
    })
    toast(t('Item removed'))
  }

  const handleLoadStarterPlan = () => {
    if (meals.length > 0 && !confirm(t('Load starter plan and add suggested meals?'))) return
    const starterMap = buildStarterDietMap()
    update(s => {
      s.dietMeals = { ...(s.dietMeals || {}), ...starterMap }
    })
    toast(t('Starter diet loaded'))
  }

  return (
    <>
      <div className="row between" style={{ alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t('Diet')}</h3>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setEditMode(!editMode)
              setAddingMeal(false)
              setAddingItemFor(null)
            }}
          >
            <Icon name="pencil" />
            <span style={{ marginLeft: 4 }}>{editMode ? t('Done') : t('Edit')}</span>
          </button>
        </div>
      </div>

      {/* Day picker */}
      <div className="row between" style={{ marginBottom: 14 }}>
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

      {/* Daily Macros & Adherence summary */}
      {totalItems > 0 && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'var(--bg-card, rgba(255,255,255,0.04))',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            marginBottom: 16,
          }}
        >
          <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>
                {consumed.cals}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}>
                / {planned.cals} kcal
              </span>
            </div>
            <span
              className="tag"
              style={{
                fontSize: 12,
                fontWeight: 600,
                background: pct === 100 ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: pct === 100 ? '#fff' : 'inherit',
              }}
            >
              {pct != null ? `${pct}%` : '0%'}
            </span>
          </div>

          {/* Macro chips */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                {t('Protein')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {consumed.p}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                  /{planned.p}g
                </span>
              </div>
            </div>
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                {t('Carbs')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {consumed.c}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                  /{planned.c}g
                </span>
              </div>
            </div>
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                {t('Fat')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {consumed.f}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                  /{planned.f}g
                </span>
              </div>
            </div>
          </div>

          {/* Adherence progress bar */}
          <div
            style={{
              height: 6,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct || 0}%`,
                height: '100%',
                background: 'var(--accent)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {meals.length === 0 && !editMode && (
        <div style={{ textAlign: 'center', padding: '28px 16px' }}>
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
            {t('No diet plan configured yet.')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
            <Button onClick={handleLoadStarterPlan} className="btn-primary">
              <Icon name="sparkles" />
              <span style={{ marginLeft: 6 }}>{t('Load starter plan')}</span>
            </Button>
            <Button onClick={() => setEditMode(true)} className="btn-ghost">
              <Icon name="plus" />
              <span style={{ marginLeft: 6 }}>{t('Create meals manually')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Meals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {meals.map(meal => (
          <div
            key={meal.id}
            style={{
              borderRadius: 10,
              background: 'var(--bg-card, rgba(255,255,255,0.03))',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              padding: 12,
            }}
          >
            {/* Meal Header */}
            <div className="row between" style={{ alignItems: 'center', marginBottom: meal.note ? 4 : 8 }}>
              <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{meal.title}</span>
                {meal.time && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Icon name="clock" size={12} />
                    {meal.time}
                  </span>
                )}
                {meal.optional && (
                  <span
                    className="tag"
                    style={{ fontSize: 10, padding: '1px 5px', color: 'var(--muted)' }}
                  >
                    {t('Optional')}
                  </span>
                )}
              </div>

              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                {!editMode && meal.items.length > 0 && (
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => handleToggleMeal(meal)}
                    title={meal.allChecked ? t('Uncheck all') : t('Check all')}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    {meal.allChecked ? t('Uncheck all') : t('Check all')}
                  </button>
                )}
                {editMode && (
                  <button
                    className="iconbtn"
                    style={{ width: 28, height: 28, color: 'var(--danger, #ef4444)' }}
                    onClick={() => handleDeleteMeal(meal.id)}
                    aria-label={t('Delete')}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </div>

            {meal.note && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  marginBottom: 8,
                }}
              >
                {meal.note}
              </div>
            )}

            {/* Meal Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {meal.items.map(item => (
                <div
                  key={item.id}
                  className="row between"
                  style={{
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: 8,
                    background: item.checked ? 'rgba(var(--accent-rgb, 100, 200, 100), 0.08)' : 'rgba(255,255,255,0.02)',
                    cursor: editMode ? 'default' : 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => !editMode && handleToggleItem(item.id)}
                >
                  <div className="row" style={{ gap: 10, alignItems: 'center', flex: 1 }}>
                    {!editMode && (
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: item.checked ? 'none' : '2px solid var(--muted)',
                          background: item.checked ? 'var(--accent)' : 'transparent',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {item.checked && <Icon name="check" size={12} />}
                      </span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: 13,
                          textDecoration: item.checked ? 'line-through' : 'none',
                          color: item.checked ? 'var(--muted)' : 'var(--fg)',
                          fontWeight: 500,
                        }}
                      >
                        {item.name}
                      </span>
                      <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                        {item.qty && <span>{item.qty}</span>}
                        {(item.cals > 0 || item.p > 0) && (
                          <span>
                            · {item.p > 0 && `${item.p}g P `}
                            {item.cals > 0 && `${item.cals} kcal`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {editMode && (
                    <button
                      className="iconbtn"
                      style={{ width: 24, height: 24, color: 'var(--muted)' }}
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteItem(meal.id, item.id)
                      }}
                      aria-label={t('Delete')}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
              ))}

              {meal.items.length === 0 && !editMode && (
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '4px 0' }}>
                  {t('No items in this meal')}
                </div>
              )}
            </div>

            {/* Add Item form inside meal (Edit mode) */}
            {editMode && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {addingItemFor === meal.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6 }}>
                      <TextField
                        placeholder={t('Item name')}
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        autoFocus
                      />
                      <TextField
                        placeholder={t('Portion (e.g. 150g)')}
                        value={newItemQty}
                        onChange={e => setNewItemQty(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      <TextField
                        placeholder={t('kcal')}
                        type="number"
                        value={newItemCals}
                        onChange={e => setNewItemCals(e.target.value)}
                      />
                      <TextField
                        placeholder={t('P (g)')}
                        type="number"
                        value={newItemP}
                        onChange={e => setNewItemP(e.target.value)}
                      />
                      <TextField
                        placeholder={t('C (g)')}
                        type="number"
                        value={newItemC}
                        onChange={e => setNewItemC(e.target.value)}
                      />
                      <TextField
                        placeholder={t('F (g)')}
                        type="number"
                        value={newItemF}
                        onChange={e => setNewItemF(e.target.value)}
                      />
                    </div>
                    <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                      <Button className="btn-sm btn-ghost" onClick={() => setAddingItemFor(null)}>
                        {t('Cancel')}
                      </Button>
                      <Button className="btn-sm btn-primary" onClick={() => handleAddItem(meal.id)}>
                        {t('Save item')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-xs btn-ghost"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setAddingItemFor(meal.id)
                      setNewItemName('')
                      setNewItemQty('')
                      setNewItemCals('')
                      setNewItemP('')
                      setNewItemC('')
                      setNewItemF('')
                    }}
                  >
                    <Icon name="plus" size={12} />
                    <span style={{ marginLeft: 4 }}>{t('Add item')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add Meal Button & Form (Edit mode) */}
        {editMode && (
          <div style={{ marginTop: 8 }}>
            {addingMeal ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px dashed var(--accent)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6 }}>
                  <TextField
                    placeholder={t('Meal title (e.g. 10:30 - Morning)')}
                    value={newMealTitle}
                    onChange={e => setNewMealTitle(e.target.value)}
                    autoFocus
                  />
                  <TextField
                    placeholder={t('Time (e.g. 10:30)')}
                    value={newMealTime}
                    onChange={e => setNewMealTime(e.target.value)}
                  />
                </div>
                <TextField
                  placeholder={t('Notes/instructions (optional)')}
                  value={newMealNote}
                  onChange={e => setNewMealNote(e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newMealOptional}
                    onChange={e => setNewMealOptional(e.target.checked)}
                  />
                  {t('Optional meal')}
                </label>
                <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button className="btn-sm btn-ghost" onClick={() => setAddingMeal(false)}>
                    {t('Cancel')}
                  </Button>
                  <Button className="btn-sm btn-primary" onClick={handleAddMeal}>
                    {t('Save meal')}
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setAddingMeal(true)}
                >
                  <Icon name="plus" />
                  <span style={{ marginLeft: 6 }}>{t('Add meal')}</span>
                </Button>
                <Button
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                  onClick={handleLoadStarterPlan}
                >
                  <Icon name="sparkles" />
                  <span style={{ marginLeft: 6 }}>{t('Load starter plan')}</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <Button onClick={close} style={{ width: '100%', justifyContent: 'center' }}>
          {t('Close')}
        </Button>
      </div>
    </>
  )
}
