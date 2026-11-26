import Dexie, { type Table } from 'dexie'
import type {
  AnswerDraft, Bookmark, HistoryEntry, Note, RecallAttempt, RevisionRecord, UserSettings,
} from '@/types/domain'

class StudyDatabase extends Dexie {
  revisions!: Table<RevisionRecord, string>
  bookmarks!: Table<Bookmark, string>
  notes!: Table<Note, string>
  drafts!: Table<AnswerDraft, string>
  history!: Table<HistoryEntry, number>
  recall!: Table<RecallAttempt, number>
  settings!: Table<UserSettings, string>

  constructor() {
    super('llb-study-platform')
    this.version(1).stores({
      revisions: 'key, subjectId, stage, updatedAt',
      bookmarks: 'key, subjectId, kind, targetId',
      notes: 'id, subjectId, targetType, targetId, updatedAt',
      drafts: 'key, subjectId, questionId, updatedAt',
      history: '++id, subjectId, targetId, visitedAt, [subjectId+targetType+targetId+visitedAt]',
      recall: '++id, subjectId, targetId, attemptedAt, [subjectId+targetId+attemptedAt]',
      settings: 'id',
    })
  }
}

export const db = new StudyDatabase()

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'default',
  textSize: 'normal',
  measure: 'normal',
  reducedMotion: false,
  reviewIntervalDays: 7,
}

export async function getSettings(): Promise<UserSettings> {
  return (await db.settings.get('default')) ?? DEFAULT_SETTINGS
}

export async function saveSettings(value: UserSettings): Promise<void> {
  await db.settings.put(value)
}

export const revisionKey = (subjectId: string, targetId: string) => `${subjectId}:${targetId}`
export const bookmarkKey = (subjectId: string, kind: string, targetId: string) => `${subjectId}:${kind}:${targetId}`
export const draftKey = (subjectId: string, questionId: string) => `${subjectId}:${questionId}`

export async function getRevision(subjectId: string, targetId: string): Promise<RevisionRecord | undefined> {
  return db.revisions.get(revisionKey(subjectId, targetId))
}

export async function setRevisionStage(subjectId: string, targetId: string, stage: RevisionRecord['stage']): Promise<void> {
  const key = revisionKey(subjectId, targetId)
  const existing = await db.revisions.get(key)
  await db.revisions.put({
    key,
    subjectId: subjectId as RevisionRecord['subjectId'],
    targetId,
    stage,
    difficult: existing?.difficult ?? false,
    updatedAt: Date.now(),
    lastReviewedAt: stage === 'not-studied' ? null : Date.now(),
  })
}

export async function toggleDifficult(subjectId: string, targetId: string): Promise<boolean> {
  const key = revisionKey(subjectId, targetId)
  const existing = await db.revisions.get(key)
  const difficult = !existing?.difficult
  await db.revisions.put(existing
    ? { ...existing, difficult, updatedAt: Date.now() }
    : { key, subjectId: subjectId as RevisionRecord['subjectId'], targetId, stage: 'not-studied', difficult, updatedAt: Date.now(), lastReviewedAt: null })
  return difficult
}

export async function isBookmarked(subjectId: string, kind: string, targetId: string): Promise<boolean> {
  return Boolean(await db.bookmarks.get(bookmarkKey(subjectId, kind, targetId)))
}

export async function toggleBookmark(subjectId: string, kind: Bookmark['kind'], targetId: string): Promise<boolean> {
  const key = bookmarkKey(subjectId, kind, targetId)
  const existing = await db.bookmarks.get(key)
  if (existing) {
    await db.bookmarks.delete(key)
    return false
  }
  await db.bookmarks.put({ key, subjectId: subjectId as Bookmark['subjectId'], kind, targetId, createdAt: Date.now() })
  return true
}

export async function saveNote(note: Note): Promise<void> {
  await db.notes.put({ ...note, updatedAt: Date.now() })
}

export async function notesFor(targetType: string, targetId: string): Promise<Note[]> {
  return db.notes.where('targetId').equals(targetId).filter((n) => n.targetType === targetType).toArray()
}

export async function saveDraft(draft: AnswerDraft): Promise<void> {
  await db.drafts.put({ ...draft, updatedAt: Date.now() })
}

export async function getDraft(subjectId: string, questionId: string): Promise<AnswerDraft | undefined> {
  return db.drafts.get(draftKey(subjectId, questionId))
}

export async function logVisit(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
  await db.history.add({ ...entry, visitedAt: Date.now() })
}

export async function logRecall(entry: Omit<RecallAttempt, 'id'>): Promise<void> {
  await db.recall.add({ ...entry, attemptedAt: Date.now() })
}
