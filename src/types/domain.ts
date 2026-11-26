/** Core academic and personal-data domain types. Academic records are immutable;
 *  personal records are user-generated and stored in IndexedDB. */

export type SubjectId = 'crpc' | 'labour-law-1'

export interface Subject {
  id: SubjectId
  name: string
  shortName: string
  paperCode: string
  university: string
  programme: string
  semester: string
  credits: number
  fullMarks: number
  writtenMarks: number
  internalMarks: number
  passMarks: number
  duration: string
  description: string
  sourceNote: string
}

export interface Unit {
  id: string
  subjectId: SubjectId
  number: number
  title: string
  marks: number
  order: number
}

export interface StudyGuidance {
  kind: 'derived'
  concepts: string[]
  provisions: string[]
  distinctions: string[]
  approach: string | null
}

export interface Topic {
  id: string
  unitId: string
  subjectId: SubjectId
  code: string
  title: string
  order: number
  sectionRefs: string[]
  guidance: StudyGuidance | null
  referredCases: string[]
}

export interface Paper {
  id: string
  subjectId: SubjectId
  year: number
  heldIn: number | null
  examTitle: string
  paperCode: string
  marks: number
  duration: string
  format: 'standard' | 'grouped'
  sourceFile: string
  sections: string[]
  note: string | null
}

export type MappingStatus = 'verified' | 'reviewed' | 'provisional' | 'unmapped'

export interface Question {
  id: string
  subjectId: SubjectId
  paperId: string
  year: number
  number: string
  subNumber: string | null
  wording: string
  marks: number | null
  marksLabel: string | null
  section: string
  isAlternative: boolean
  topicIds: string[]
  mappingStatus: MappingStatus
  sourceFile: string
}

export interface PredictionEvidence {
  year: number
  questionNumber: string
  marks: number | null
  note: string
}

export interface Prediction {
  id: string
  subjectId: SubjectId
  reportId: string
  rank: number | null
  title: string
  question: string
  rating: string | null
  priority: string | null
  topicIds: string[]
  evidence: PredictionEvidence[]
  scope: string | null
  uncertainty: string | null
}

export interface PredictionReport {
  id: string
  subjectId: SubjectId
  title: string
  year: number
  documentPath: string
  summary: string
}

export interface AcademicContent {
  subjects: Subject[]
  units: Unit[]
  topics: Topic[]
  papers: Paper[]
  questions: Question[]
  predictions: Prediction[]
  reports: PredictionReport[]
}

/* ---------------- Personal data ---------------- */

export type RevisionStage =
  | 'not-studied'
  | 'first-study'
  | 'first-revision'
  | 'active-recall'
  | 'answer-practice'
  | 'final-revision'

export const REVISION_STAGES: { id: RevisionStage; label: string }[] = [
  { id: 'not-studied', label: 'Not Studied' },
  { id: 'first-study', label: 'First Study Completed' },
  { id: 'first-revision', label: 'First Revision Completed' },
  { id: 'active-recall', label: 'Active Recall Completed' },
  { id: 'answer-practice', label: 'Answer-Writing Practice Completed' },
  { id: 'final-revision', label: 'Final Revision Completed' },
]

export interface RevisionRecord {
  key: string
  subjectId: SubjectId
  targetId: string
  stage: RevisionStage
  difficult: boolean
  updatedAt: number
  lastReviewedAt: number | null
}

export type BookmarkKind = 'topic' | 'question' | 'prediction' | 'material'
export interface Bookmark {
  key: string
  subjectId: SubjectId
  kind: BookmarkKind
  targetId: string
  createdAt: number
}

export interface Note {
  id: string
  subjectId: SubjectId
  targetType: 'topic' | 'question' | 'prediction' | 'general'
  targetId: string | null
  body: string
  createdAt: number
  updatedAt: number
}

export interface AnswerDraft {
  key: string
  subjectId: SubjectId
  questionId: string
  body: string
  confidence: 'not-sure' | 'partial' | 'confident'
  updatedAt: number
}

export interface HistoryEntry {
  id?: number
  subjectId: SubjectId
  targetType: string
  targetId: string
  label: string
  visitedAt: number
}

export type RecallResult = 'could-not' | 'partial' | 'confident'
export interface RecallAttempt {
  id?: number
  subjectId: SubjectId
  targetType: string
  targetId: string
  result: RecallResult
  attemptedAt: number
}

export interface UserSettings {
  id: 'default'
  textSize: 'normal' | 'large' | 'x-large'
  measure: 'normal' | 'wide'
  reducedMotion: boolean
  reviewIntervalDays: number
}

export interface BackupFile {
  format: 'llb-study-platform-backup'
  schemaVersion: number
  exportedAt: string
  data: {
    revisions: RevisionRecord[]
    bookmarks: Bookmark[]
    notes: Note[]
    drafts: AnswerDraft[]
    history: HistoryEntry[]
    recall: RecallAttempt[]
    settings: UserSettings[]
  }
}
