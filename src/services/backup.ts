import { z } from 'zod'
import { db } from '@/database/db'
import type { BackupFile } from '@/types/domain'

const revisionSchema = z.object({
  key: z.string(), subjectId: z.enum(['crpc', 'labour-law-1']), targetId: z.string(),
  stage: z.enum(['not-studied', 'first-study', 'first-revision', 'active-recall', 'answer-practice', 'final-revision']),
  difficult: z.boolean(), updatedAt: z.number(), lastReviewedAt: z.number().nullable(),
})
const bookmarkSchema = z.object({
  key: z.string(), subjectId: z.enum(['crpc', 'labour-law-1']),
  kind: z.enum(['topic', 'question', 'prediction', 'material']), targetId: z.string(), createdAt: z.number(),
})
const noteSchema = z.object({
  id: z.string(), subjectId: z.enum(['crpc', 'labour-law-1']),
  targetType: z.enum(['topic', 'question', 'prediction', 'general']), targetId: z.string().nullable(),
  body: z.string().max(200000), createdAt: z.number(), updatedAt: z.number(),
})
const draftSchema = z.object({
  key: z.string(), subjectId: z.enum(['crpc', 'labour-law-1']), questionId: z.string(),
  body: z.string().max(200000), confidence: z.enum(['not-sure', 'partial', 'confident']), updatedAt: z.number(),
})
const historySchema = z.object({
  id: z.number().optional(), subjectId: z.enum(['crpc', 'labour-law-1']),
  targetType: z.string(), targetId: z.string(), label: z.string(), visitedAt: z.number(),
})
const recallSchema = z.object({
  id: z.number().optional(), subjectId: z.enum(['crpc', 'labour-law-1']),
  targetType: z.string(), targetId: z.string(),
  result: z.enum(['could-not', 'partial', 'confident']), attemptedAt: z.number(),
})
const settingsSchema = z.object({
  id: z.literal('default'), textSize: z.enum(['normal', 'large', 'x-large']),
  measure: z.enum(['normal', 'wide']), reducedMotion: z.boolean(), reviewIntervalDays: z.number().int().min(1).max(365),
})

export const backupSchema = z.object({
  format: z.literal('llb-study-platform-backup'),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    revisions: z.array(revisionSchema),
    bookmarks: z.array(bookmarkSchema),
    notes: z.array(noteSchema),
    drafts: z.array(draftSchema),
    history: z.array(historySchema),
    recall: z.array(recallSchema),
    settings: z.array(settingsSchema),
  }),
})

export async function exportBackup(): Promise<BackupFile> {
  const [revisions, bookmarks, notes, drafts, history, recall, settings] = await Promise.all([
    db.revisions.toArray(), db.bookmarks.toArray(), db.notes.toArray(),
    db.drafts.toArray(), db.history.toArray(), db.recall.toArray(), db.settings.toArray(),
  ])
  return {
    format: 'llb-study-platform-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: { revisions, bookmarks, notes, drafts, history, recall, settings },
  }
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `llb-study-backup-${backup.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult = { imported: number; skipped: number; mode: 'merge' | 'replace' }

/** Imports a validated backup. Never touches academic content. Existing records
 *  win on conflict in merge mode; replace mode clears personal data first. */
export async function importBackup(text: string, mode: 'merge' | 'replace'): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  const result = backupSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('The backup file does not match the expected schema. No data was changed.')
  }
  const { data } = result.data
  if (mode === 'replace') {
    await Promise.all([
      db.revisions.clear(), db.bookmarks.clear(), db.notes.clear(),
      db.drafts.clear(), db.history.clear(), db.recall.clear(), db.settings.clear(),
    ])
  }

  let imported = 0
  let skipped = 0
  const put = async <T>(table: { get: (k: never) => Promise<T | undefined>; put: (v: T) => Promise<unknown> }, key: never, value: T) => {
    if (mode === 'merge' && await table.get(key)) { skipped += 1; return }
    await table.put(value)
    imported += 1
  }

  for (const r of data.revisions) await put(db.revisions as never, r.key as never, r as never)
  for (const b of data.bookmarks) await put(db.bookmarks as never, b.key as never, b as never)
  for (const n of data.notes) await put(db.notes as never, n.id as never, n as never)
  for (const d of data.drafts) await put(db.drafts as never, d.key as never, d as never)
  for (const s of data.settings) await put(db.settings as never, s.id as never, s as never)
  for (const h of data.history) {
    const existing = await db.history.where('[subjectId+targetType+targetId+visitedAt]').equals([h.subjectId, h.targetType, h.targetId, h.visitedAt]).first()
    if (existing && mode === 'merge') { skipped += 1; continue }
    await db.history.put(h)
    imported += 1
  }
  for (const r of data.recall) {
    const existing = await db.recall.where('[subjectId+targetId+attemptedAt]').equals([r.subjectId, r.targetId, r.attemptedAt]).first()
    if (existing && mode === 'merge') { skipped += 1; continue }
    await db.recall.put(r)
    imported += 1
  }
  return { imported, skipped, mode }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const e = await navigator.storage.estimate()
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
}
