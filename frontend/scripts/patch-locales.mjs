import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'locales')

export function addLocaleKeys(entries) {
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

    // Find the last closing brace before export default or EOF
    const lastBraceIdx = content.lastIndexOf('}')
    if (lastBraceIdx === -1) continue

    const before = content.slice(0, lastBraceIdx)
    const after = content.slice(lastBraceIdx)
    const addition = '\n  // --- supplements ---\n' + linesToAdd.join('\n') + '\n'

    writeFileSync(filePath, before + addition + after, 'utf8')
    console.log(`Updated ${file}`)
  }
}

const SUPPLEMENT_KEYS = {
  'Supplements': { pt: 'Suplementos' },
  'Track your daily supplements and vitamins.': { pt: 'Acompanhe seus suplementos e vitaminas diários.' },
  'Add supplement': { pt: 'Adicionar suplemento' },
  'Edit supplement': { pt: 'Editar suplemento' },
  'Supplement name': { pt: 'Nome do suplemento' },
  'Dose (optional)': { pt: 'Dose (opcional)' },
  'Time (optional, e.g. 08:00)': { pt: 'Horário (opcional, ex: 08:00)' },
  'No supplements added yet.': { pt: 'Nenhum suplemento adicionado ainda.' },
  'All taken!': { pt: 'Tudo tomado!' },
  '{0} of {1} taken': { pt: '{0} de {1} tomados' },
  'Supplement removed': { pt: 'Suplemento removido' },
  'Supplement saved': { pt: 'Suplemento salvo' },
  '{0} day streak': { pt: '{0} dias seguidos' },
  'Mark as taken': { pt: 'Marcar como tomado' },
}

addLocaleKeys(SUPPLEMENT_KEYS)
