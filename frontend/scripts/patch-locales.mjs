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

const DIET_KEYS = {
  'Diet': { pt: 'Dieta' },
  'Track meals, protein and macros.': { pt: 'Acompanhe refeições, proteínas e macros.' },
  'All meals logged!': { pt: 'Todas as refeições registradas!' },
  '{0} of {1} items ({2} kcal)': { pt: '{0} de {1} itens ({2} kcal)' },
  'Meal added': { pt: 'Refeição adicionada' },
  'Meal removed': { pt: 'Refeição removida' },
  'Remove this meal?': { pt: 'Remover esta refeição?' },
  'Item added': { pt: 'Item adicionado' },
  'Item removed': { pt: 'Item removido' },
  'Load starter plan and add suggested meals?': { pt: 'Carregar plano inicial e adicionar refeições sugeridas?' },
  'Starter diet loaded': { pt: 'Plano inicial carregado' },
  'Protein': { pt: 'Proteína' },
  'Carbs': { pt: 'Carboidratos' },
  'Fat': { pt: 'Gorduras' },
  'No diet plan configured yet.': { pt: 'Nenhum plano alimentar configurado ainda.' },
  'Load starter plan': { pt: 'Carregar modelo inicial' },
  'Create meals manually': { pt: 'Criar refeições manualmente' },
  'Optional': { pt: 'Opcional' },
  'Check all': { pt: 'Marcar todas' },
  'Uncheck all': { pt: 'Desmarcar todas' },
  'No items in this meal': { pt: 'Nenhum item nesta refeição' },
  'Item name': { pt: 'Nome do item' },
  'Portion (e.g. 150g)': { pt: 'Porção (ex: 150g)' },
  'kcal': { pt: 'kcal' },
  'P (g)': { pt: 'P (g)' },
  'C (g)': { pt: 'C (g)' },
  'F (g)': { pt: 'G (g)' },
  'Save item': { pt: 'Salvar item' },
  'Add item': { pt: 'Adicionar item' },
  'Meal title (e.g. 10:30 - Morning)': { pt: 'Título da refeição (ex: 10h30 - Manhã)' },
  'Time (e.g. 10:30)': { pt: 'Horário (ex: 10:30)' },
  'Notes/instructions (optional)': { pt: 'Instruções/observações (opcional)' },
  'Optional meal': { pt: 'Refeição opcional' },
  'Save meal': { pt: 'Salvar refeição' },
  'Add meal': { pt: 'Adicionar refeição' },
}

addLocaleKeys(DIET_KEYS, 'diet')
