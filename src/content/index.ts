import raw from './generated/content.json'
import type {
  AcademicContent, Paper, Prediction, Question, Subject, SubjectId, Topic, Unit,
} from '@/types/domain'

import crpcSyllabus from './documents/crpc/syllaub.md?raw'
import crpc2016 from './documents/crpc/2016_criminal_procedure_code_sem-III.md?raw'
import crpc2017 from './documents/crpc/2017_criminal_procedure_code_sem-III.md?raw'
import crpc2018 from './documents/crpc/2018_criminal_procedure_code_sem-III.md?raw'
import crpc2019 from './documents/crpc/2019_criminal_procedure_code_sem-III.md?raw'
import crpc2020 from './documents/crpc/question_paper_2020.md?raw'
import crpc2021 from './documents/crpc/question_paper_2021.md?raw'
import crpc2022 from './documents/crpc/question_paper_2021-23.md?raw'
import crpc2024 from './documents/crpc/question_paper_2024.md?raw'
import crpcReport from './documents/crpc/2025_prediction_report.md?raw'

import labourSyllabus from './documents/labour-law-1/syllabus.md?raw'
import labourPrediction from './documents/labour-law-1/prediction-2026.md?raw'
import labourPapers from './documents/labour-law-1/previous-question-papers.md?raw'
import labourInventory from './documents/labour-law-1/source-inventory.md?raw'
import labourVerification from './documents/labour-law-1/verification-report.md?raw'

export const documents: Record<string, string> = {
  'crpc/syllaub.md': crpcSyllabus,
  'crpc/2016_criminal_procedure_code_sem-III.md': crpc2016,
  'crpc/2017_criminal_procedure_code_sem-III.md': crpc2017,
  'crpc/2018_criminal_procedure_code_sem-III.md': crpc2018,
  'crpc/2019_criminal_procedure_code_sem-III.md': crpc2019,
  'crpc/question_paper_2020.md': crpc2020,
  'crpc/question_paper_2021.md': crpc2021,
  'crpc/question_paper_2021-23.md': crpc2022,
  'crpc/question_paper_2024.md': crpc2024,
  'crpc/2025_prediction_report.md': crpcReport,
  'labour-law-1/syllabus.md': labourSyllabus,
  'labour-law-1/prediction-2026.md': labourPrediction,
  'labour-law-1/previous-question-papers.md': labourPapers,
  'labour-law-1/source-inventory.md': labourInventory,
  'labour-law-1/verification-report.md': labourVerification,
}

export const content = raw as unknown as AcademicContent

export const subjects: Subject[] = content.subjects
export const units: Unit[] = content.units
export const topics: Topic[] = content.topics
export const papers: Paper[] = content.papers
export const questions: Question[] = content.questions
export const predictions: Prediction[] = content.predictions
export const reports = content.reports

export const getSubject = (id: string | undefined): Subject | undefined =>
  subjects.find((s) => s.id === id)

export const unitsFor = (subjectId: SubjectId): Unit[] =>
  units.filter((u) => u.subjectId === subjectId).sort((a, b) => a.order - b.order)

export const topicsFor = (subjectId: SubjectId): Topic[] =>
  topics.filter((t) => t.subjectId === subjectId).sort((a, b) => a.order - b.order)

export const topicsInUnit = (unitId: string): Topic[] =>
  topics.filter((t) => t.unitId === unitId).sort((a, b) => a.order - b.order)

export const getTopic = (id: string | undefined): Topic | undefined =>
  topics.find((t) => t.id === id)

export const papersFor = (subjectId: SubjectId): Paper[] =>
  papers.filter((p) => p.subjectId === subjectId).sort((a, b) => a.year - b.year)

export const getPaper = (id: string | undefined): Paper | undefined =>
  papers.find((p) => p.id === id)

export const questionsForPaper = (paperId: string): Question[] =>
  questions.filter((q) => q.paperId === paperId)

export const questionsForTopic = (topicId: string): Question[] =>
  questions.filter((q) => q.topicIds.includes(topicId)).sort((a, b) => a.year - b.year || a.number.localeCompare(b.number))

export const getQuestion = (id: string | undefined): Question | undefined =>
  questions.find((q) => q.id === id)

export const predictionsFor = (subjectId: SubjectId): Prediction[] =>
  predictions.filter((p) => p.subjectId === subjectId).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))

export const predictionsForTopic = (topicId: string): Prediction[] =>
  predictions.filter((p) => p.topicIds.includes(topicId))

export const getPrediction = (id: string | undefined): Prediction | undefined =>
  predictions.find((p) => p.id === id)

export const getReport = (id: string | undefined) =>
  reports.find((r) => r.id === id)

export const paperDocument = (paper: Paper): string | undefined =>
  paper.subjectId === 'labour-law-1'
    ? documents['labour-law-1/previous-question-papers.md']
    : documents[`crpc/${paper.sourceFile}`]

export const reportDocument = (reportId: string): string =>
  documents[reports.find((r) => r.id === reportId)?.documentPath ?? ''] ?? ''

export const labelForTopic = (id: string): string => {
  const t = getTopic(id)
  return t ? `${t.code} — ${t.title}` : id
}
