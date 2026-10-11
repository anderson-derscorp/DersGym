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

const FEEDBACK_KEYS = {
  'Biweekly check-in': { pt: 'Feedback quinzenal' },
  'Time for your 15-day review!': { pt: 'Hora da sua revisão de 15 dias!' },
  '15-day progress & wellness reflection': { pt: 'Reflexão de progresso e bem-estar quinzenal' },
  'New check-in': { pt: 'Novo feedback' },
  'Check-in date': { pt: 'Data do feedback' },
  'Body measurements': { pt: 'Medidas corporais' },
  'Weight ({0})': { pt: 'Peso ({0})' },
  'Body fat (%)': { pt: 'Gordura corporal (%)' },
  'Waist (cm)': { pt: 'Cintura (cm)' },
  'Hips (cm)': { pt: 'Quadril (cm)' },
  'Arm (cm)': { pt: 'Braço (cm)' },
  'Thigh (cm)': { pt: 'Coxa (cm)' },
  'Wellness & energy ratings (1-10)': { pt: 'Avaliação de bem-estar e energia (1-10)' },
  'Mood / Humor': { pt: 'Humor' },
  'Energy level': { pt: 'Nível de energia' },
  'Motivation & focus': { pt: 'Motivação e foco' },
  'Stress level': { pt: 'Nível de estresse' },
  'Relaxed': { pt: 'Tranquilo' },
  'Overwhelmed': { pt: 'Muito estressado' },
  'Reflection & wins': { pt: 'Reflexão e vitórias' },
  'Fortnight wins (what went well)': { pt: 'Vitórias da quinzena (o que correu bem)' },
  'e.g. Completed all 4 workout days, kept creatine consistent': { pt: 'ex: Concluiu os 4 treinos, manteve a creatina diária' },
  'Challenges & difficulties': { pt: 'Dificuldades e desafios' },
  'e.g. Afternoon sweet cravings, missed water target on Thursday': { pt: 'ex: Vontade de doce à tarde, bebeu menos água na quinta' },
  'Next fortnight adjustments & notes': { pt: 'Ajustes para a próxima quinzena e notas' },
  'e.g. Increase bench press weight, sleep before midnight': { pt: 'ex: Aumentar carga no supino, dormir antes da meia-noite' },
  'Save biweekly feedback': { pt: 'Salvar feedback quinzenal' },
  'Biweekly feedback saved': { pt: 'Feedback quinzenal salvo' },
  'Remove this feedback?': { pt: 'Remover este feedback?' },
  'Feedback removed': { pt: 'Feedback removido' },
  'Latest check-in': { pt: 'Último feedback' },
  'days since previous': { pt: 'dias desde o anterior' },
  'Fat': { pt: 'Gordura' },
  'Focus': { pt: 'Foco' },
  'Wins': { pt: 'Vitórias' },
  'Challenges': { pt: 'Desafios' },
  'Previous check-ins': { pt: 'Feedbacks anteriores' },
  '15 days reached! Review your progress and measurements.': { pt: '15 dias completados! Revise seu progresso e medidas.' },
  'Last check-in {0} days ago ({1}).': { pt: 'Último feedback há {0} dias ({1}).' },
  'Track measurements, ratings and fortnightly wins.': { pt: 'Acompanhe medidas, notas de bem-estar e vitórias.' },
  'Due': { pt: 'Pendente' },
  'Arm': { pt: 'Braço' },
  'High': { pt: 'Alto' },
  'Low': { pt: 'Baixo' },
  'Stress': { pt: 'Estresse' },
  'Thigh': { pt: 'Coxa' },
  'Weight': { pt: 'Peso' },
}

addLocaleKeys(FEEDBACK_KEYS, 'feedback')
