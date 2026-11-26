import { getSubject, papers, predictions, questions, subjects, topics } from '@/content'
import type { SubjectId } from '@/types/domain'

export type SearchKind = 'subject' | 'topic' | 'question' | 'paper' | 'prediction'
export interface SearchHit {
  id: string
  kind: SearchKind
  subjectId: SubjectId
  title: string
  snippet: string
  to: string
}

export interface SearchFilters {
  subjectId: SubjectId | 'all'
  kind: SearchKind | 'all'
  year: string
}

interface IndexedItem extends SearchHit {
  haystack: string
}

/** Built once at module load: the academic corpus is small and fully local. */
const index: IndexedItem[] = [
  ...subjects.map((s) => ({
    id: s.id, kind: 'subject' as const, subjectId: s.id,
    title: s.name, snippet: `${s.paperCode} · ${s.semester}`,
    to: `/subjects/${s.id}`, haystack: `${s.name} ${s.shortName} ${s.paperCode} ${s.description}`.toLowerCase(),
  })),
  ...topics.map((t) => ({
    id: t.id, kind: 'topic' as const, subjectId: t.subjectId,
    title: `${t.code} — ${t.title}`, snippet: getSubject(t.subjectId)?.shortName ?? t.subjectId,
    to: `/subjects/${t.subjectId}/topics/${t.id}`,
    haystack: `${t.code} ${t.title} ${t.sectionRefs.join(' ')}`.toLowerCase(),
  })),
  ...questions.map((q) => ({
    id: q.id, kind: 'question' as const, subjectId: q.subjectId,
    title: `Q${q.number}${q.subNumber ? `(${q.subNumber})` : ''} — ${q.wording.slice(0, 110)}`,
    snippet: `${q.year}${q.marksLabel ? ` · ${q.marksLabel}` : ''} · ${getSubject(q.subjectId)?.shortName ?? ''}`,
    to: `/subjects/${q.subjectId}/questions/${q.id}`,
    haystack: `${q.wording} ${q.year} ${q.marksLabel ?? ''}`.toLowerCase(),
  })),
  ...papers.map((p) => ({
    id: p.id, kind: 'paper' as const, subjectId: p.subjectId,
    title: `${p.year} Examination Paper`, snippet: `${p.paperCode} · ${p.marks} marks${p.heldIn ? ` · held ${p.heldIn}` : ''}`,
    to: `/subjects/${p.subjectId}/papers/${p.id}`,
    haystack: `${p.year} ${p.examTitle} ${p.paperCode} ${p.heldIn ?? ''}`.toLowerCase(),
  })),
  ...predictions.map((p) => ({
    id: p.id, kind: 'prediction' as const, subjectId: p.subjectId,
    title: p.title, snippet: `Prediction ${p.rank ?? ''} · ${p.rating ?? ''}${p.priority ? ` · ${p.priority}` : ''}`,
    to: `/subjects/${p.subjectId}/predictions/${p.id}`,
    haystack: `${p.title} ${p.question} ${p.rating ?? ''} ${p.priority ?? ''}`.toLowerCase(),
  })),
]

export function search(query: string, filters: SearchFilters): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean)
  return index
    .filter((item) => filters.subjectId === 'all' || item.subjectId === filters.subjectId)
    .filter((item) => filters.kind === 'all' || item.kind === filters.kind)
    .filter((item) => !filters.year || item.haystack.includes(filters.year))
    .filter((item) => !terms.length || terms.every((term) => item.haystack.includes(term)))
    .slice(0, 80)
    .map(({ haystack: _haystack, ...hit }) => hit)
}
