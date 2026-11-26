import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DEFAULT_SETTINGS, db, getSettings, isBookmarked, logVisit, saveSettings,
  setRevisionStage, toggleBookmark, toggleDifficult,
} from '@/database/db'
import type {
  Bookmark, BookmarkKind, Note, RevisionRecord, RevisionStage, UserSettings,
} from '@/types/domain'

type Toast = { id: number; message: string; tone: 'info' | 'success' | 'warning' | 'danger' }

interface AppDataValue {
  ready: boolean
  settings: UserSettings
  revisions: RevisionRecord[]
  bookmarks: Bookmark[]
  notes: Note[]
  toasts: Toast[]
  revisionFor: (subjectId: string, targetId: string) => RevisionRecord | undefined
  stageFor: (subjectId: string, targetId: string) => RevisionStage
  setStage: (subjectId: string, targetId: string, stage: RevisionStage) => Promise<void>
  isDifficult: (subjectId: string, targetId: string) => boolean
  toggleDifficultFlag: (subjectId: string, targetId: string) => Promise<void>
  hasBookmark: (subjectId: string, kind: BookmarkKind, targetId: string) => boolean
  toggleBookmarkFlag: (subjectId: string, kind: BookmarkKind, targetId: string) => Promise<void>
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
  visit: (subjectId: string, targetType: string, targetId: string, label: string) => void
  notify: (message: string, tone?: Toast['tone']) => void
  refresh: () => Promise<void>
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [revisions, setRevisions] = useState<RevisionRecord[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const refresh = useCallback(async () => {
    const [s, r, b, n] = await Promise.all([
      getSettings(), db.revisions.toArray(), db.bookmarks.toArray(), db.notes.toArray(),
    ])
    setSettings(s)
    setRevisions(r)
    setBookmarks(b)
    setNotes(n)
  }, [])

  useEffect(() => {
    refresh().then(() => setReady(true)).catch(() => setReady(true))
  }, [refresh])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.textSize = settings.textSize
    root.dataset.measure = settings.measure
    root.dataset.reducedMotion = String(settings.reducedMotion)
  }, [settings])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastId.current
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4200)
  }, [])

  const revisionFor = useCallback((subjectId: string, targetId: string) =>
    revisions.find((r) => r.key === `${subjectId}:${targetId}`), [revisions])

  const stageFor = useCallback((subjectId: string, targetId: string): RevisionStage =>
    revisionFor(subjectId, targetId)?.stage ?? 'not-studied', [revisionFor])

  const setStage = useCallback(async (subjectId: string, targetId: string, stage: RevisionStage) => {
    await setRevisionStage(subjectId, targetId, stage)
    await refresh()
  }, [refresh])

  const isDifficult = useCallback((subjectId: string, targetId: string) =>
    Boolean(revisionFor(subjectId, targetId)?.difficult), [revisionFor])

  const toggleDifficultFlag = useCallback(async (subjectId: string, targetId: string) => {
    const now = await toggleDifficult(subjectId, targetId)
    await refresh()
    notify(now ? 'Marked as difficult.' : 'Removed from difficult topics.', 'success')
  }, [refresh, notify])

  const hasBookmark = useCallback((subjectId: string, kind: BookmarkKind, targetId: string) =>
    bookmarks.some((b) => b.key === `${subjectId}:${kind}:${targetId}`), [bookmarks])

  const toggleBookmarkFlag = useCallback(async (subjectId: string, kind: BookmarkKind, targetId: string) => {
    const now = await toggleBookmark(subjectId, kind, targetId)
    await refresh()
    notify(now ? 'Saved to bookmarks.' : 'Removed from bookmarks.', 'success')
  }, [refresh, notify])

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    await saveSettings({ ...settings, ...patch })
    await refresh()
  }, [settings, refresh])

  const visit = useCallback((subjectId: string, targetType: string, targetId: string, label: string) => {
    void logVisit({ subjectId: subjectId as 'crpc' | 'labour-law-1', targetType, targetId, label, visitedAt: Date.now() })
      .catch(() => undefined)
  }, [])

  const value = useMemo<AppDataValue>(() => ({
    ready, settings, revisions, bookmarks, notes, toasts,
    revisionFor, stageFor, setStage, isDifficult, toggleDifficultFlag,
    hasBookmark, toggleBookmarkFlag, updateSettings, visit, notify, refresh,
  }), [ready, settings, revisions, bookmarks, notes, toasts, revisionFor, stageFor, setStage,
    isDifficult, toggleDifficultFlag, hasBookmark, toggleBookmarkFlag, updateSettings, visit, notify, refresh])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}

/** Keeps a local bookmark flag in sync with the shared store. */
export function useBookmark(subjectId: string, kind: BookmarkKind, targetId: string) {
  const { hasBookmark, toggleBookmarkFlag } = useAppData()
  const active = hasBookmark(subjectId, kind, targetId)
  return { active, toggle: () => toggleBookmarkFlag(subjectId, kind, targetId) }
}

export { isBookmarked }
