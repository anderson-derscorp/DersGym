import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'locales')

export function addLocaleKeys(entries, section = 'wellness') {
  const files = readdirSync(localesDir).filter(f => f.endsWith('.js'))

  for (const file of files) {
    const filePath = join(localesDir, file)
    let content = readFileSync(filePath, 'utf8')
    const isPt = file === 'pt.js' || file === 'pt-BR.js'

    const linesToAdd = []
    for (const [key, trans] of Object.entries(entries)) {
      if (content.includes(JSON.stringify(key) + ':')) continue
      const val = (isPt && trans.pt) ? trans.pt : key
      linesToAdd.push(`  ${JSON.stringify(key)}: ${JSON.stringify(val)},`)
    }

    if (!linesToAdd.length) continue

    const lastBraceIdx = content.lastIndexOf('}')
    if (lastBraceIdx === -1) continue

    const before = content.slice(0, lastBraceIdx)
    const after = content.slice(lastBraceIdx)
    const addition = `\n  // --- ${section} ---\n` + linesToAdd.join('\n') + '\n'

    writeFileSync(filePath, before + addition + after, 'utf8')
    console.log(`Updated ${file}`)
  }
}

const DAILY_LOG_KEYS = {
  'Daily log': { pt: 'Diário' },
  'Log water, sleep, mood, energy and cardio.': { pt: 'Registre água, sono, humor, energia e cardio.' },
  'Water (L)': { pt: 'Água (L)' },
  'Sleep (hours)': { pt: 'Sono (horas)' },
  'Mood': { pt: 'Humor' },
  'Energy': { pt: 'Energia' },
  'Cardio (minutes)': { pt: 'Cardio (minutos)' },
  'Daily score: {0}%': { pt: 'Pontuação do dia: {0}%' },
  'Daily log saved': { pt: 'Diário salvo' },
  'Daily log removed': { pt: 'Diário removido' },
  'Awful': { pt: 'Péssimo' },
  'Poor': { pt: 'Ruim' },
  'Okay': { pt: 'Normal' },
  'Great': { pt: 'Ótimo' },
  'Drained': { pt: 'Esgotado' },
  'Charged': { pt: 'No máximo' },
  'Clear log': { pt: 'Limpar diário' },
  'Notes': { pt: 'Anotações' },
}

addLocaleKeys(DAILY_LOG_KEYS, 'daily-log')
