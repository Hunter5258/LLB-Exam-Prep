import { topicsFor } from '@/content'
import type { RevisionRecord, SubjectId } from '@/types/domain'

const STAGE_WEIGHT: Record<string, number> = {
  'not-studied': 0,
  'first-study': 1,
  'first-revision': 2,
  'active-recall': 3,
  'answer-practice': 4,
  'final-revision': 5,
}

export function subjectProgress(subjectId: SubjectId, revisions: RevisionRecord[]) {
  const topics = topicsFor(subjectId)
  const map = new Map(revisions.filter((r) => r.subjectId === subjectId).map((r) => [r.targetId, r]))
  const started = topics.filter((t) => (STAGE_WEIGHT[map.get(t.id)?.stage ?? 'not-studied'] ?? 0) > 0).length
  const complete = topics.filter((t) => (STAGE_WEIGHT[map.get(t.id)?.stage ?? 'not-studied'] ?? 0) >= 5).length
  const score = topics.reduce((sum, t) => sum + (STAGE_WEIGHT[map.get(t.id)?.stage ?? 'not-studied'] ?? 0), 0)
  return {
    total: topics.length,
    started,
    complete,
    percent: topics.length ? Math.round((score / (topics.length * 5)) * 100) : 0,
  }
}

export function dueTopics(subjectId: SubjectId, revisions: RevisionRecord[], intervalDays: number) {
  const now = Date.now()
  const ms = intervalDays * 24 * 60 * 60 * 1000
  return revisions
    .filter((r) => r.subjectId === subjectId && r.stage !== 'not-studied' && r.stage !== 'final-revision')
    .filter((r) => !r.lastReviewedAt || now - r.lastReviewedAt >= ms)
    .sort((a, b) => (a.lastReviewedAt ?? 0) - (b.lastReviewedAt ?? 0))
}
