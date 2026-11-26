import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Flag, Info } from 'lucide-react'
import { Badge, Button, EmptyState } from '@/components/ui/UI'
import { getPaper, getSubject } from '@/content'
import { useAppData } from '@/hooks/useAppData'
import { REVISION_STAGES, type BookmarkKind, type Question, type RevisionStage, type Topic } from '@/types/domain'

export function BookmarkButton({ subjectId, kind, targetId, label = 'Bookmark' }: {
  subjectId: string; kind: BookmarkKind; targetId: string; label?: string
}) {
  const { hasBookmark, toggleBookmarkFlag } = useAppData()
  const active = hasBookmark(subjectId, kind, targetId)
  return (
    <Button
      size="sm"
      variant={active ? 'primary' : 'secondary'}
      aria-pressed={active}
      icon={active ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
      onClick={() => void toggleBookmarkFlag(subjectId, kind, targetId)}
      title={active ? 'Remove bookmark' : 'Save to bookmarks'}
    >
      {label}
    </Button>
  )
}

export function DifficultButton({ subjectId, targetId }: { subjectId: string; targetId: string }) {
  const { isDifficult, toggleDifficultFlag } = useAppData()
  const active = isDifficult(subjectId, targetId)
  return (
    <Button size="sm" variant={active ? 'danger' : 'secondary'} aria-pressed={active}
      icon={<Flag size={15} />} onClick={() => void toggleDifficultFlag(subjectId, targetId)}>
      {active ? 'Difficult' : 'Mark difficult'}
    </Button>
  )
}

export function RevisionSelect({ subjectId, targetId, compact = false }: {
  subjectId: string; targetId: string; compact?: boolean
}) {
  const { stageFor, setStage } = useAppData()
  const stage = stageFor(subjectId, targetId)
  return (
    <label className="field" style={{ minWidth: compact ? 160 : 220 }}>
      <span className="field__label">Study status</span>
      <select className="select" value={stage}
        onChange={(e) => void setStage(subjectId, targetId, e.target.value as RevisionStage)}>
        {REVISION_STAGES.map((s) => <option value={s.id} key={s.id}>{s.label}</option>)}
      </select>
    </label>
  )
}

export function RevisionControls({ subjectId, targetId }: { subjectId: string; targetId: string }) {
  return (
    <div className="panel u-row u-row--wrap" style={{ alignItems: 'flex-end' }}>
      <RevisionSelect subjectId={subjectId} targetId={targetId} />
      <DifficultButton subjectId={subjectId} targetId={targetId} />
      <BookmarkButton subjectId={subjectId} kind="topic" targetId={targetId} />
    </div>
  )
}

export function MappingNote() {
  return (
    <p className="legal-note u-row" style={{ alignItems: 'flex-start' }}>
      <Info size={15} style={{ flex: 'none', marginTop: 2 }} aria-hidden="true" />
      <span>Topic links are <strong>provisional</strong> text matches derived from verified source wording. They are not verified academic mappings. Original question wording is never altered.</span>
    </p>
  )
}

export function QuestionRow({ question, showPaper = true }: { question: Question; showPaper?: boolean }) {
  const paper = getPaper(question.paperId)
  const subject = getSubject(question.subjectId)
  const to = `/subjects/${question.subjectId}/questions/${question.id}`
  return (
    <li className="list-item">
      <div className="list-item__main">
        <div className="u-row u-gap-2" style={{ flexWrap: 'wrap' }}>
          <Badge tone="neutral" year>{question.year}</Badge>
          <span className="t-label">Q{question.number}{question.subNumber ? `(${question.subNumber})` : ''}</span>
          {question.isAlternative && <Badge tone="outline">Alternative</Badge>}
          {question.marks != null && <Badge tone="info">{question.marks} marks</Badge>}
        </div>
        <p className="list-item__title u-wrap-anywhere u-mt-2">
          <Link to={to} style={{ color: 'inherit' }}>{question.wording}</Link>
        </p>
        {showPaper && paper && (
          <p className="list-item__meta">
            {subject?.shortName} · <Link to={`/subjects/${question.subjectId}/papers/${paper.id}`}>{paper.year} paper</Link>
            {paper.heldIn ? ` · held ${paper.heldIn}` : ''}
          </p>
        )}
      </div>
      <div className="list-item__end">
        <BookmarkButton subjectId={question.subjectId} kind="question" targetId={question.id} label="" />
      </div>
    </li>
  )
}

export function QuestionList({ items, emptyTitle = 'No questions found', showPaper = true }: {
  items: Question[]; emptyTitle?: string; showPaper?: boolean
}) {
  if (!items.length) return <EmptyState title={emptyTitle} message="No verified question matches this view." />
  return <ul className="list">{items.map((q) => <QuestionRow key={q.id} question={q} showPaper={showPaper} />)}</ul>
}

export function TopicRow({ topic, subjectId, showStatus = true }: {
  topic: Topic; subjectId: string; showStatus?: boolean
}) {
  const { stageFor } = useAppData()
  const stage = stageFor(subjectId, topic.id)
  return (
    <li className="list-item list-item--click">
      <Link to={`/subjects/${subjectId}/topics/${topic.id}`} className="u-row u-grow" style={{ color: 'inherit', gap: 'var(--sp-3)' }}>
        <span className="t-label" style={{ width: 62, flex: 'none' }}>{topic.code}</span>
        <span className="list-item__main">
          <span className="list-item__title u-wrap-anywhere">{topic.title}</span>
          {topic.sectionRefs.length > 0 && (
            <span className="list-item__meta">{topic.sectionRefs.slice(0, 3).join(' · ')}</span>
          )}
        </span>
      </Link>
      {showStatus && <Badge tone={stage === 'not-studied' ? 'neutral' : 'success'}>
        {REVISION_STAGES.find((s) => s.id === stage)?.label.replace(' Completed', '')}
      </Badge>}
    </li>
  )
}

export function StatuteBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal-block">
      <h4>{title}</h4>
      <div className="t-body">{children}</div>
    </div>
  )
}
