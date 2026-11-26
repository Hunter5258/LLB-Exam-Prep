/**
 * Content pipeline: verified Markdown -> typed JSON records.
 * Original source documents are never modified. All generated topic-question
 * mappings are PROVISIONAL text matches, never claimed as verified.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DOC = path.join(ROOT, 'src', 'content', 'documents')
const OUT = path.join(ROOT, 'src', 'content', 'generated')
fs.mkdirSync(OUT, { recursive: true })

const read = (p) => fs.readFileSync(p, 'utf8')
const writeJSON = (name, value) =>
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', 'utf8')

const pad = (n, width = 3) => String(n).padStart(width, '0')
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const stripMd = (s) => clean(String(s ?? '').replace(/\*\*/g, '').replace(/\*/g, ''))

/* ------------------------------------------------------------------ */
/* Subjects                                                            */
/* ------------------------------------------------------------------ */
const subjects = [
  {
    id: 'crpc',
    name: 'Criminal Procedure Code, 1973',
    shortName: 'CrPC',
    paperCode: '3.2',
    university: 'Gauhati University',
    programme: 'LL.B. (Old Course)',
    semester: 'Third Semester (Semester III)',
    credits: 6,
    fullMarks: 100,
    writtenMarks: 80,
    internalMarks: 20,
    passMarks: 45,
    duration: '3 hours',
    description: 'The law and procedure governing criminal courts, investigation, trial, bail and appeal under the Code of Criminal Procedure, 1973. All statutory references retain CrPC numbering as printed in the prescribed syllabus.',
    sourceNote: 'Old-course CrPC syllabus. BNSS numbering is not substituted. Where the prediction report discusses BNSS, it is flagged as unverified comparison.',
  },
  {
    id: 'labour-law-1',
    name: 'Labour and Industrial Law – I',
    shortName: 'Labour Law I',
    paperCode: '5.1',
    university: 'Gauhati University',
    programme: 'Three-Year LL.B.',
    semester: 'Fifth Semester (Semester V)',
    credits: 5,
    fullMarks: 100,
    writtenMarks: 80,
    internalMarks: 20,
    passMarks: 45,
    duration: '3 hours',
    description: 'Trade unions, industrial disputes, factories, workmen’s compensation, minimum wages and the Assam Shops and Establishments Act, 1961 as prescribed for Paper 5.1.',
    sourceNote: 'Official syllabus: printed pages 97–98 of 3-yrs.-LL.B.pdf. Derived guidance is clearly separated from verbatim syllabus wording.',
  },
]

/* ------------------------------------------------------------------ */
/* CrPC syllabus                                                       */
/* ------------------------------------------------------------------ */
const crpcSyllabus = read(path.join(DOC, 'crpc', 'syllaub.md'))
const units = []
const topics = []

{
  const lines = crpcSyllabus.split(/\r?\n/)
  let current = null
  let topicIndex = 0
  let lastTopic = null
  for (const line of lines) {
    const unitMatch = line.match(/^## Unit (\d+):\s*(.+?)\s+—\s+(\d+)\s*$/)
    if (unitMatch) {
      const n = Number(unitMatch[1])
      current = { id: `CRPC-U${pad(n, 2)}`, subjectId: 'crpc', number: n, title: clean(unitMatch[2]), marks: Number(unitMatch[3]), order: n }
      units.push(current)
      topicIndex = 0
      lastTopic = null
      continue
    }
    if (/^## Referred Cases|^## Internal|^\*\*\*\*/.test(line)) { current = null; continue }
    if (!current) continue
    const topicMatch = line.match(/^(\d+\.\d+)\s+(.+)$/)
    if (topicMatch) {
      topicIndex += 1
      const refs = []
      for (const m of clean(topicMatch[2]).matchAll(/\((Ss?\.?[^)]*)\)/g)) refs.push(clean(m[1]))
      for (const m of clean(topicMatch[2]).matchAll(/\bSs?\.?\s*\d[\dA-Za-z,.\s–-]*/g)) {
        const v = clean(m[0])
        if (v && !refs.includes(v)) refs.push(v)
      }
      lastTopic = {
        id: `CRPC-U${pad(current.number, 2)}-T${pad(topicIndex)}`,
        unitId: current.id,
        subjectId: 'crpc',
        code: topicMatch[1],
        title: clean(topicMatch[2]),
        order: topicIndex,
        sectionRefs: refs,
        guidance: null,
        referredCases: [],
      }
      topics.push(lastTopic)
      continue
    }
    // continuation lines belonging to the previous topic (e.g. 4.2 a. b.)
    if (lastTopic && /^\s+(?:[a-z]|[ivx]+)\.\s+\S/.test(line)) {
      lastTopic.title += ' ' + clean(line)
    }
  }
}

/* ------------------------------------------------------------------ */
/* Labour syllabus                                                     */
/* ------------------------------------------------------------------ */
const labourSyllabus = read(path.join(DOC, 'labour-law-1', 'syllabus.md'))
{
  const unitRows = [...labourSyllabus.matchAll(/^\|\s*(U\d)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/gm)]
  for (const m of unitRows) {
    const n = Number(m[1].slice(1))
    units.push({ id: m[1], subjectId: 'labour-law-1', number: n, title: clean(m[2]), marks: Number(m[3]), order: n })
  }

  // Layer B detailed topic breakdown
  const blocks = [...labourSyllabus.matchAll(/^#### (U\d-T\d+) — (.+)$/gm)]
  for (let i = 0; i < blocks.length; i++) {
    const id = `LABOUR-${blocks[i][1]}`
    const unitNo = Number(blocks[i][1][1])
    const body = labourSyllabus.slice(blocks[i].index, blocks[i + 1]?.index ?? labourSyllabus.length)
    const field = (label) => {
      const m = body.match(new RegExp(`-\\s+\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, 'i'))
      return m ? clean(m[1]) : null
    }
    const splitItems = (v) => (v ? v.split(/;\s*/).map(clean).filter(Boolean) : [])
    const official = field('Official topic heading')
    topics.push({
      id,
      unitId: `U${unitNo}`,
      subjectId: 'labour-law-1',
      code: (official || blocks[i][2]).split(/\s+/, 1)[0],
      title: official || clean(blocks[i][2]),
      order: topics.filter((t) => t.subjectId === 'labour-law-1' && t.unitId === `U${unitNo}`).length + 1,
      sectionRefs: [],
      guidance: {
        kind: 'derived',
        concepts: splitItems(field('Concepts to understand')),
        provisions: splitItems(field('Important statutory provisions \\(identifiable from source\\)')),
        distinctions: splitItems(field('Legal distinctions')),
        approach: field('Suggested answer-preparation approach'),
      },
      referredCases: [],
    })
  }

  // Merge answer-preparation approach from Section D
  for (const m of labourSyllabus.matchAll(/^\*\*(U\d-T\d+) — .+?\*\*$/gm)) {
    const id = `LABOUR-${m[1]}`
    const t = topics.find((x) => x.id === id)
    if (!t) continue
    const tail = labourSyllabus.slice(m.index, m.index + 1600)
    const approach = tail.match(/-\s+\*\*Suggested answer-preparation approach:\*\*\s*([^\n]+)/)
    if (approach && t.guidance) t.guidance.approach = clean(approach[1])
  }

  // Referred cases, verbatim from Layer A
  const caseLines = [...labourSyllabus.matchAll(/^\s*\d+\.\s+(.+?(?:AIR|SCC|SCR|LLJ|LLI|SSC)[^\n]*)$/gm)]
    .map((m) => clean(m[1]))
    .filter((s) => /vs\.|v\./i.test(s))
  const caseByUnit = { U1: [], U2: [], U3: [], U4: [], U5: [] }
  for (const c of caseLines) {
    if (/Trade Union|Rangaswami/i.test(c)) caseByUnit.U1.push(c)
    else if (/Rohtas|Bangalore Water|Osmania|Dimakutri/i.test(c)) caseByUnit.U2.push(c)
    else if (/Lal Mohammad/i.test(c)) caseByUnit.U3.push(c)
    else if (/Saurashtra|Democratic Rights|Bandhua/i.test(c)) caseByUnit.U4.push(c)
  }
  for (const t of topics.filter((x) => x.subjectId === 'labour-law-1')) {
    t.referredCases = caseByUnit[t.unitId] ?? []
  }
}

/* ------------------------------------------------------------------ */
/* Question helpers                                                    */
/* ------------------------------------------------------------------ */
const papers = []
const questions = []

function marksFrom(label) {
  if (!label) return null
  const s = clean(label).replace(/[()[\]]/g, '')
  let m = s.match(/(\d+)\s*[x×]\s*\d+\s*=\s*(\d+)/)
  if (m) return Number(m[2])
  m = s.match(/=\s*(\d+)/)
  if (m) return Number(m[1])
  m = s.match(/\b(\d+)\b/)
  return m ? Number(m[1]) : null
}

function extractSectionNumbers(text) {
  const out = new Set()
  for (const m of String(text).matchAll(/\bSs?\.?\s*(\d{1,4}[A-Za-z]?)/g)) out.add(m[1])
  for (const m of String(text).matchAll(/\bsection\s+(\d{1,4}[A-Za-z]?)/gi)) out.add(m[1])
  return [...out]
}

function topicSectionNumbers(topic) {
  const out = new Set()
  for (const ref of topic.sectionRefs) {
    for (const m of ref.matchAll(/\b(\d{1,4}[A-Za-z]?)\b/g)) out.add(m[1])
  }
  return [...out]
}

const STOP = new Set(['the', 'and', 'for', 'with', 'under', 'from', 'that', 'this', 'into', 'about', 'which', 'what', 'when', 'where', 'discuss', 'explain', 'describe', 'provisions', 'relating', 'between', 'following', 'answer', 'write', 'notes', 'act', 'code', 'crpc', 'india', 'indian', 'section', 'sections', 'trial', 'cases', 'question', 'difference', 'distinguish', 'elucidate', 'state', 'briefly', 'detail', 'details', 'procedure'])
function keywords(text) {
  return [...new Set(stripMd(text).toLowerCase().match(/[a-z]{5,}/g) || [])].filter((w) => !STOP.has(w))
}

function mapTopics(subjectId, wording, preferredCodes = []) {
  if (preferredCodes.length) {
    const ids = preferredCodes
      .map((code) => topics.find((t) => t.subjectId === subjectId && (t.code === code || t.id.endsWith(code))))
      .filter(Boolean)
      .map((t) => t.id)
    if (ids.length) return { topicIds: ids, mappingStatus: 'provisional' }
  }
  const numbers = extractSectionNumbers(wording)
  if (subjectId === 'crpc' && numbers.length) {
    const ids = topics.filter((t) => t.subjectId === 'crpc' && topicSectionNumbers(t).some((n) => numbers.includes(n))).map((t) => t.id)
    if (ids.length) return { topicIds: [...new Set(ids)].slice(0, 4), mappingStatus: 'provisional' }
  }
  const words = keywords(wording)
  if (!words.length) return { topicIds: [], mappingStatus: 'unmapped' }
  const scored = topics
    .filter((t) => t.subjectId === subjectId)
    .map((t) => ({ id: t.id, score: keywords(`${t.title} ${t.sectionRefs.join(' ')}`).filter((w) => words.includes(w)).length }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  return scored.length
    ? { topicIds: scored.map((x) => x.id), mappingStatus: 'provisional' }
    : { topicIds: [], mappingStatus: 'unmapped' }
}

/* ------------------------------------------------------------------ */
/* CrPC papers                                                         */
/* ------------------------------------------------------------------ */
const crpcFiles = [
  ['2016_criminal_procedure_code_sem-III.md', 'CRPC-QP-2016'],
  ['2017_criminal_procedure_code_sem-III.md', 'CRPC-QP-2017'],
  ['2018_criminal_procedure_code_sem-III.md', 'CRPC-QP-2018'],
  ['2019_criminal_procedure_code_sem-III.md', 'CRPC-QP-2019'],
  ['question_paper_2020.md', 'CRPC-QP-2020'],
  ['question_paper_2021.md', 'CRPC-QP-2021'],
  ['question_paper_2021-23.md', 'CRPC-QP-2022'],
  ['question_paper_2024.md', 'CRPC-QP-2024'],
]

for (const [file, id] of crpcFiles) {
  const text = read(path.join(DOC, 'crpc', file))
  const meta = {}
  for (const m of text.matchAll(/^\*\*([^*]+):\*\*\s*(.+)$/gm)) meta[clean(m[1])] = clean(m[2])
  const yearMatch = meta.Year?.match(/(\d{4})/)
  const year = Number(yearMatch?.[1] ?? file.match(/(20\d{2})/)?.[1])
  const heldIn = meta.Year?.match(/Held in (\d{4})/)?.[1]
  const sections = [...text.matchAll(/^## (GROUP[–-][A-Z]+)/gm)].map((m) => clean(m[1]))
  papers.push({
    id,
    subjectId: 'crpc',
    year,
    heldIn: heldIn ? Number(heldIn) : null,
    examTitle: `Gauhati University LL.B. Semester III — ${clean(meta.Subject || 'Criminal Procedure Code')}`,
    paperCode: meta.Paper || '3.2',
    marks: Number(meta['Full Marks']?.match(/\d+/)?.[0] ?? 80),
    duration: meta.Time || '3 hours',
    format: sections.length ? 'grouped' : 'standard',
    sourceFile: file,
    sections: sections.length ? sections : ['Questions'],
    note: id === 'CRPC-QP-2022' ? 'Printed year 2022; held in 2023. The filename says 2021-23 but the paper header prints 2022.' : (heldIn ? `Held in ${heldIn}.` : null),
  })

  const lines = text.split(/\r?\n/)
  let current = null
  let section = sections[0] ?? 'Questions'
  let alternative = false
  let seq = 0
  let currentNumber = null
  let parentMapping = { topicIds: [], mappingStatus: 'unmapped' }
  const flush = () => {
    if (current) {
      if (!current.subNumber && current.topicIds.length) parentMapping = { topicIds: current.topicIds, mappingStatus: current.mappingStatus }
      else if (!current.topicIds.length && parentMapping.topicIds.length) {
        current.topicIds = parentMapping.topicIds
        current.mappingStatus = 'provisional'
      }
      questions.push(current)
      current = null
    }
  }
  for (const line of lines) {
    const sec = line.match(/^## (GROUP[–-][A-Z]+)/)
    if (sec) { flush(); section = clean(sec[1]); continue }
    const top = line.match(/^([1-9]\d*)\.\s+(.*)$/)
    if (top) {
      flush()
      parentMapping = { topicIds: [], mappingStatus: 'unmapped' }
      const number = top[1]
      currentNumber = number
      let wording = clean(top[2])
      let marksLabel = null
      const mm = wording.match(/\*\*([^*]*\d[^*]*)\*\*\s*$/)
      if (mm) { marksLabel = clean(mm[1]); wording = clean(wording.slice(0, mm.index)) }
      if (!wording) wording = marksLabel || ''
      seq += 1
      current = {
        id: `CRPC-Q-${year}-${pad(seq)}`,
        subjectId: 'crpc', paperId: id, year, number,
        subNumber: null, wording, marks: marksFrom(marksLabel), marksLabel,
        section, isAlternative: false, sourceFile: file,
        ...mapTopics('crpc', wording),
      }
      alternative = false
      continue
    }
    if (/^\s*\*\*Or\*\*\s*$/i.test(line) || /^\s*\*\*OR\*\*\s*$/i.test(line)) { flush(); alternative = true; continue }
    if (!current) continue
    const sub = line.match(/^\s{2,}(?:(\d+|[a-z]|[ivx]+)\.)\s+(.+)$/)
    if (sub && !/^\s*\*\*/.test(line)) {
      flush()
      let wordingSub = clean(sub[2])
      let marksLabel = null
      const mm = wordingSub.match(/\*\*([^*]*\d[^*]*)\*\*\s*$/)
      if (mm) { marksLabel = clean(mm[1]); wordingSub = clean(wordingSub.slice(0, mm.index)) }
      seq += 1
      current = {
        id: `CRPC-Q-${year}-${pad(seq)}`,
        subjectId: 'crpc', paperId: id, year, number: currentNumber,
        subNumber: sub[1].toUpperCase(), wording: wordingSub || marksLabel || '',
        marks: marksFrom(marksLabel), marksLabel, section, isAlternative: alternative, sourceFile: file,
        ...mapTopics('crpc', wordingSub),
      }
      continue
    }
    if (alternative && /^\s{2,}\S/.test(line) && !/^\s*\*\*Or\*\*/i.test(line)) {
      const addition = clean(line)
      if (addition && !/^\*\*/.test(addition)) current.wording += ' ' + addition
    } else if (!/^\s/.test(line) && line.trim() && !/^#|^---|^\*The figures/.test(line)) {
      if (alternative && current.isAlternative) current.wording += ' ' + clean(line)
    }
  }
  flush()
}

/* ------------------------------------------------------------------ */
/* Labour papers                                                       */
/* ------------------------------------------------------------------ */
const labourText = read(path.join(DOC, 'labour-law-1', 'previous-question-papers.md'))
const yearChunks = [...labourText.matchAll(/^## (\d{4}) Examination\s*$/gm)]
for (let i = 0; i < yearChunks.length; i++) {
  const year = Number(yearChunks[i][1])
  const chunk = labourText.slice(yearChunks[i].index, yearChunks[i + 1]?.index ?? labourText.length)
  const id = `LABOUR-QP-${year}`
  const sourcePdf = clean(chunk.match(/\*\*Source PDF:\*\*\s*([^\n]+)/)?.[1] ?? '')
  const heldIn = chunk.match(/held in (\d{4})/i)?.[1]
  papers.push({
    id, subjectId: 'labour-law-1', year,
    heldIn: heldIn ? Number(heldIn) : null,
    examTitle: clean(chunk.match(/\*\*Examination:\*\*\s*([^\n]+)/)?.[1] ?? `LL.B. Paper 5.1 — ${year}`),
    paperCode: '5.1',
    marks: Number(chunk.match(/\*\*Maximum Marks:\*\*[^\d]*(\d+)/)?.[1] ?? 80),
    duration: clean(chunk.match(/\*\*Duration:\*\*\s*([^\n]+)/)?.[1] ?? 'Three hours'),
    format: 'standard', sourceFile: sourcePdf || 'previous-question-papers.md',
    sections: [...new Set([...chunk.matchAll(/^#### QP-\d{4}-Q\d+\s*—\s*([^(\n]+)/gm)].map((m) => clean(m[1])))],
    note: heldIn ? `That examination was held in ${heldIn}.` : null,
  })

  const blocks = [...chunk.matchAll(/^#### (QP-\d{4}-Q\d+)(?:\s*—\s*([^\n]+))?\s*$/gm)]
  for (let b = 0; b < blocks.length; b++) {
    const qid = blocks[b][1]
    const section = clean(blocks[b][2] || 'Questions')
    const body = chunk.slice(blocks[b].index, blocks[b + 1]?.index ?? chunk.length)
    const headline = body.match(/^\*\*([\s\S]*?)\*\*/m)?.[1]
    const mainText = clean((headline || qid).replace(/^\d+\.\s*/, ''))
    let marksLabel = mainText.match(/(?:[:=]|\b)(\d+\s*[×x]\s*\d+\s*=\s*\d+|\[\d+\]|\d+\+\d+(?:\+\d+)*|\b\d+\s*marks\b|\b\d+\b)\s*$/i)?.[0] ?? null
    let wording = clean(mainText.replace(/(?:[:=]|\b)(\d+\s*[×x]\s*\d+\s*=\s*\d+|\[\d+\]|\d+\+\d+(?:\+\d+)*|\b\d+\s*marks\b|\b\d+\b)\s*$/i, ''))
    if (wording.length < 8) { wording = mainText; marksLabel = null }
    const number = qid.match(/Q(\d+)$/)?.[1] ?? '0'
    const add = (sub, text, alt, label) => {
      if (!text) return
      questions.push({
        id: `${qid}${sub ? '-' + sub : ''}`,
        subjectId: 'labour-law-1', paperId: id, year, number,
        subNumber: sub, wording: text, marks: marksFrom(label), marksLabel: label,
        section, isAlternative: alt, sourceFile: 'previous-question-papers.md',
        ...mapTopics('labour-law-1', text),
      })
    }
    add(null, wording, false, marksLabel)
    for (const m of body.matchAll(/^- \*\*(?:QP-\d{4}-Q\d+-)?([A-Z0-9]+):\*\*\s*(.+)$/gm)) {
      let subText = clean(m[2])
      let subLabel = subText.match(/(\[\d+\]|\b\d+\s*marks\b)\s*$/i)?.[0] ?? null
      subText = clean(subText.replace(/(\[\d+\]|\b\d+\s*marks\b)\s*$/i, ''))
      add(m[1], subText, false, subLabel)
    }
    const orIndex = body.search(/^>\s*\*\*OR\*\*/im)
    if (orIndex >= 0) {
      const orBody = body.slice(orIndex)
      const orLines = orBody.split(/\r?\n/)
        .filter((l) => /^>/.test(l) && !/^\s*>\s*\*\*OR\*\*/i.test(l))
        .map((l) => clean(l.replace(/^>\s*/, '').replace(/^-\s*/, '').replace(/\*\*/g, '')))
        .filter(Boolean)
      const orSubs = []
      const textLines = []
      for (const l of orLines) {
        const sm = l.match(/^(?:QP-\d{4}-Q\d+-OR-)?([A-Z0-9]+):\s*(.+)$/)
        if (sm) orSubs.push([sm[1], clean(sm[2])])
        else textLines.push(l)
      }
      add('OR', textLines.join(' '), true, null)
      for (const [sub, text] of orSubs) add(`OR-${sub}`, text, true, null)
    }
  }
}

/* ------------------------------------------------------------------ */
/* Predictions                                                         */
/* ------------------------------------------------------------------ */
const predictions = []
const reports = [
  { id: 'CRPC-REPORT-2025', subjectId: 'crpc', title: 'Historical pattern analysis and 2025 question predictions', year: 2025, documentPath: 'crpc/2025_prediction_report.md', summary: 'Evidence-based analysis of eight verified CrPC papers (2016–2024), with a ranked prediction list, model paper and explicit limitations.' },
  { id: 'LABOUR-REPORT-2026', subjectId: 'labour-law-1', title: 'Historical Examination Analysis and 2026 Prediction Report', year: 2026, documentPath: 'labour-law-1/prediction-2026.md', summary: 'Evidence-based analysis of ten verified papers (2015–2025; 2022 absent), with 30 ranked predictions, detailed evidence dossiers and a practice model paper.' },
]

{
  const text = read(path.join(DOC, 'crpc', '2025_prediction_report.md'))
  const partD = text.slice(text.indexOf('# Part D:'), text.indexOf('# Part E:'))
  const entries = [...partD.matchAll(/^\*\*(\d+)\.\s+([\s\S]*?)\*\*,\s*Unit\s+([\d.–\-\s]+)\.?/gm)]
  for (let i = 0; i < entries.length; i++) {
    const m = entries[i]
    const body = partD.slice(m.index, entries[i + 1]?.index ?? partD.length)
    const title = clean(m[2])
    const evidence = clean(body.match(/^Evidence:\s*(.+)$/m)?.[1] ?? '')
    const confidence = clean(body.match(/^Confidence:\s*(.+)$/m)?.[1] ?? '').match(/^(High|Medium|Low)/i)?.[0] ?? null
    const codePart = clean(m[3]).match(/(\d+)\.(\d+)/)
    const preferred = codePart ? [`U${pad(codePart[1], 2)}-T${pad(codePart[2], 3)}`] : []
    const ev = []
    for (const e of evidence.matchAll(/(20\d{2})\s+Q(\d+(?:\([^)]*\))?)(?:\s*\((\d+)(?:\+[^)]*)?\))?/g)) {
      ev.push({ year: Number(e[1]), questionNumber: e[2], marks: e[3] ? Number(e[3]) : null, note: '' })
    }
    predictions.push({
      id: `CRPC-P-${pad(m[1])}`, subjectId: 'crpc', reportId: 'CRPC-REPORT-2025',
      rank: Number(m[1]), title: title.replace(/\.\s*Type.*$/, ''), question: title,
      rating: confidence, priority: null,
      topicIds: mapTopics('crpc', title, preferred).topicIds,
      evidence: ev.slice(0, 12), scope: null, uncertainty: null,
    })
  }
}

{
  const text = read(path.join(DOC, 'labour-law-1', 'prediction-2026.md'))
  const table = text.slice(text.indexOf('# 15.'), text.indexOf('# 16.'))
  const rows = [...table.matchAll(/^\|\s*(P\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/gm)]
  for (const r of rows) {
    const id = `LABOUR-${r[1]}`
    const detailStart = text.indexOf(`### ${r[1]} —`)
    const detail = detailStart >= 0 ? text.slice(detailStart, text.indexOf('\n### ', detailStart + 5) >= 0 ? text.indexOf('\n### ', detailStart + 5) : text.length) : ''
    const field = (label) => clean(detail.match(new RegExp(`-\\s+\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, 'i'))?.[1] ?? '')
    const evidenceText = field('Historical Evidence')
    const ev = []
    for (const e of evidenceText.matchAll(/(20\d{2})\s+Q(\d+(?:\([^)]*\))?)(?:\s*\((\d+)(?:\+[^)]*)?\))?/g)) {
      ev.push({ year: Number(e[1]), questionNumber: e[2], marks: e[3] ? Number(e[3]) : null, note: '' })
    }
    const codes = clean(r[3]).split(/[/,\s]+/).filter((c) => /^U\d-T\d+$/.test(c))
    const preferred = codes.map((c) => c.replace('U', 'U').replace('-T0', '-T00'))
    predictions.push({
      id, subjectId: 'labour-law-1', reportId: 'LABOUR-REPORT-2026',
      rank: Number(r[1].slice(1)), title: clean(r[4]),
      question: field('Predicted Question') || clean(r[4]),
      rating: clean(r[7]) || field('Prediction Confidence').match(/^(Very High|High|Moderate|Low)/i)?.[0] || null,
      priority: clean(r[8]) || field('Revision Priority').match(/^(Critical|High|Medium|General)/i)?.[0] || null,
      topicIds: mapTopics('labour-law-1', clean(r[4]), preferred).topicIds,
      evidence: ev.slice(0, 12),
      scope: field('Preparation Scope') || null,
      uncertainty: field('Uncertainty') || null,
    })
  }
}

/* ------------------------------------------------------------------ */
/* Output + integrity checks                                           */
/* ------------------------------------------------------------------ */
const content = { subjects, units, topics, papers, questions, predictions, reports }
writeJSON('content.json', content)

const problems = []
const ids = [...subjects, ...units, ...topics, ...papers, ...questions, ...predictions, ...reports].map((x) => x.id)
if (new Set(ids).size !== ids.length) problems.push('duplicate IDs detected')
for (const q of questions) {
  if (!papers.some((p) => p.id === q.paperId)) problems.push(`question ${q.id} has invalid paperId`)
  for (const t of q.topicIds) if (!topics.some((x) => x.id === t)) problems.push(`question ${q.id} has invalid topicId ${t}`)
}
for (const p of predictions) {
  if (!reports.some((r) => r.id === p.reportId)) problems.push(`prediction ${p.id} has invalid reportId`)
}
writeJSON('validation.json', {
  generatedAt: new Date().toISOString(),
  counts: Object.fromEntries(Object.entries(content).map(([k, v]) => [k, v.length])),
  problems: [...new Set(problems)],
  mappingNote: 'All topic-question mappings are provisional text matches (verified source wording, heuristic association). No mapping is claimed as verified.',
})

console.log(`Content built: ${questions.length} questions, ${topics.length} topics, ${papers.length} papers, ${predictions.length} predictions`)
if (problems.length) {
  console.warn(`Validation problems (${problems.length}):`)
  for (const p of [...new Set(problems)].slice(0, 20)) console.warn(' - ' + p)
}
