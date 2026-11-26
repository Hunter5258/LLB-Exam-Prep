import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Eye, Filter, ListFilter, RotateCcw } from 'lucide-react'
import { Badge, Breadcrumbs, Button, Card, Disclosure, EmptyState, Field, Spinner } from '@/components/ui/UI'
import { BookmarkButton, MappingNote, QuestionList, RevisionSelect } from '@/components/academic/Academic'
import {
  getPaper, getQuestion, getSubject, getTopic, papersFor, questions, questionsForTopic,
  topicsFor, unitsFor,
} from '@/content'
import { getDraft, logRecall, saveDraft } from '@/database/db'
import { useAppData } from '@/hooks/useAppData'
import type { RecallResult } from '@/types/domain'

export function QuestionBankPage({ subjectId }: { subjectId: string }) {
  const subject = getSubject(subjectId)
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useState(params.get('q') ?? '')
  const year = params.get('year') ?? ''
  const topicId = params.get('topic') ?? ''
  const unitId = params.get('unit') ?? ''
  const marks = params.get('marks') ?? ''
  const format = params.get('format') ?? ''

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }

  const results = useMemo(() => {
    if (!subject) return []
    const unitTopicIds = unitId ? new Set(topicsFor(subject.id).filter((t) => t.unitId === unitId).map((t) => t.id)) : null
    return questions.filter((q) => {
      if (q.subjectId !== subject.id) return false
      if (term && !q.wording.toLowerCase().includes(term.toLowerCase())) return false
      if (year && String(q.year) !== year) return false
      if (topicId && !q.topicIds.includes(topicId)) return false
      if (unitTopicIds && !q.topicIds.some((t) => unitTopicIds.has(t))) return false
      if (marks && q.marks !== Number(marks)) return false
      if (format === 'objective' && !/fill|choose|true|false|correct answer/i.test(q.wording)) return false
      if (format === 'long' && q.number === '1' && q.section === 'Questions') return false
      return true
    }).slice(0, 200)
  }, [subject, term, year, topicId, unitId, marks, format])

  if (!subject) return <EmptyState title="Subject not found" />
  const years = [...new Set(papersFor(subject.id).map((p) => p.year))].sort((a, b) => b - a)
  const clear = () => { setParams({}, { replace: true }); setTerm('') }

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: `/subjects/${subject.id}` },
        { label: 'Question Bank' },
      ]} />
      <div className="page__head">
        <span className="t-overline">Unified question index</span>
        <h1 className="t-title">Question Bank</h1>
        <p className="t-subtitle">Every verified question stored once, with links to its paper and topic. Topic links are provisional text matches.</p>
      </div>

      <div className="split-layout u-grid" style={{ gridTemplateColumns: '260px minmax(0,1fr)', alignItems: 'start' }}>
        <Card title={<span className="u-row u-gap-2"><ListFilter size={17} /> Filters</span>}>
          <div className="u-col u-gap-4">
            <Field label="Search wording" htmlFor="qb-term">
              <input id="qb-term" className="input" value={term} placeholder="e.g. anticipatory bail"
                onChange={(e) => { setTerm(e.target.value); setParam('q', e.target.value) }} />
            </Field>
            <Field label="Examination year" htmlFor="qb-year">
              <select id="qb-year" className="select" value={year} onChange={(e) => setParam('year', e.target.value)}>
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Unit" htmlFor="qb-unit">
              <select id="qb-unit" className="select" value={unitId} onChange={(e) => { setParam('unit', e.target.value); setParam('topic', '') }}>
                <option value="">All units</option>
                {unitsFor(subject.id).map((u) => <option key={u.id} value={u.id}>Unit {u.number} — {u.title}</option>)}
              </select>
            </Field>
            <Field label="Topic" htmlFor="qb-topic">
              <select id="qb-topic" className="select" value={topicId} onChange={(e) => setParam('topic', e.target.value)}>
                <option value="">All topics</option>
                {topicsFor(subject.id).filter((t) => !unitId || t.unitId === unitId).map((t) =>
                  <option key={t.id} value={t.id}>{t.code} — {t.title}</option>)}
              </select>
            </Field>
            <Field label="Marks" htmlFor="qb-marks">
              <select id="qb-marks" className="select" value={marks} onChange={(e) => setParam('marks', e.target.value)}>
                <option value="">Any marks</option>
                {[1, 2, 4, 5, 6, 7, 8, 10, 12, 14].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Question type" htmlFor="qb-format">
              <select id="qb-format" className="select" value={format} onChange={(e) => setParam('format', e.target.value)}>
                <option value="">All types</option>
                <option value="objective">Objective / short</option>
                <option value="long">Long answer</option>
              </select>
            </Field>
            <Button onClick={clear} icon={<RotateCcw size={15} />}>Clear filters</Button>
          </div>
        </Card>

        <div className="u-col u-gap-4">
          <div className="u-between">
            <span className="t-support"><strong>{results.length}</strong> question(s) shown{maxsuffix(results.length)}</span>
            <Badge tone="info"><Filter size={12} /> Local search</Badge>
          </div>
          <MappingNote />
          <QuestionList items={results} emptyTitle="No questions match these filters" />
        </div>
      </div>
    </div>
  )
}

const maxsuffix = (n: number) => n >= 200 ? ' (result limit reached)' : ''

export function QuestionDetailPage({ subjectId, questionId }: { subjectId: string; questionId?: string }) {
  const question = getQuestion(questionId)
  const subject = getSubject(subjectId)
  const { ready } = useAppData()
  if (!ready) return <Spinner />
  if (!question || !subject || question.subjectId !== subject.id) return <EmptyState title="Question not found" />
  const paper = getPaper(question.paperId)
  const linkedQuestions = questionsForTopic(question.topicIds[0] ?? '').filter((q) => q.id !== question.id).slice(0, 5)

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: `/subjects/${subject.id}` },
        { label: 'Question Bank', to: `/subjects/${subject.id}/questions` },
        { label: `Q${question.number}${question.subNumber ? `(${question.subNumber})` : ''}` },
      ]} />
      <div className="page__head">
        <span className="t-overline">{question.year} · Question {question.number}{question.subNumber ? `(${question.subNumber})` : ''} · {question.section}</span>
        <h1 className="t-title" style={{ fontSize: 'var(--fs-xl)' }}>{question.wording}</h1>
        <div className="u-row u-row--wrap">
          {question.marks != null && <Badge tone="info">{question.marks} marks</Badge>}
          {question.marksLabel && <Badge tone="outline">{question.marksLabel}</Badge>}
          {question.isAlternative && <Badge tone="warning">Internal alternative</Badge>}
          <Badge tone="neutral">Mapping: {question.mappingStatus}</Badge>
        </div>
      </div>

      <Card title="Study controls">
        <div className="u-row u-row--wrap">
          <BookmarkButton subjectId={subject.id} kind="question" targetId={question.id} />
          <Link to={`/subjects/${subject.id}/practice/question/${question.id}`} className="btn btn--primary btn--sm">Practise this answer</Link>
          <RevisionSelect subjectId={subject.id} targetId={question.id} compact />
        </div>
      </Card>

      <div className="u-grid u-grid--2">
        <Card title="Source &amp; related records">
          {paper && <p className="t-body">Original paper: <Link to={`/subjects/${subject.id}/papers/${paper.id}`}>{paper.year} examination</Link>{paper.heldIn ? ` (held ${paper.heldIn})` : ''}</p>}
          <p className="t-support u-mt-2">Source file: <code>{question.sourceFile}</code></p>
          <h3 className="t-topic u-mt-4">Associated syllabus topics</h3>
          {question.topicIds.length ? (
            <ul className="list u-mt-2">{question.topicIds.map((id) => {
              const t = getTopic(id)
              return <li className="list-item" key={id}>
                <span className="list-item__main">
                  <span className="t-label">{t?.code}</span>
                  <p className="list-item__title u-wrap-anywhere">{t?.title ?? id}</p>
                </span>
                {t && <Link to={`/subjects/${subject.id}/topics/${t.id}`} className="btn btn--tertiary btn--sm">Study topic</Link>}
              </li>
            })}</ul>
          ) : <p className="t-support">No topic association has been made for this question.</p>}
        </Card>

        <Card title="Personal answer draft">
          <AnswerEditor subjectId={subject.id} questionId={question.id} />
        </Card>
      </div>

      {linkedQuestions.length > 0 && (
        <Disclosure title="Other questions on the same topic">
          <QuestionList items={linkedQuestions} />
        </Disclosure>
      )}
      <MappingNote />
    </div>
  )
}

function AnswerEditor({ subjectId, questionId }: { subjectId: string; questionId: string }) {
  const { notify } = useAppData()
  const [body, setBody] = useState('')
  const [confidence, setConfidence] = useState<'not-sure' | 'partial' | 'confident'>('not-sure')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void getDraft(subjectId as 'crpc' | 'labour-law-1', questionId).then((d) => {
      if (!active || !d) return
      setBody(d.body)
      setConfidence(d.confidence)
    })
    return () => { active = false }
  }, [subjectId, questionId])

  const save = async () => {
    setSaving(true)
    await saveDraft({ key: `${subjectId}:${questionId}`, subjectId: subjectId as 'crpc' | 'labour-law-1', questionId, body, confidence, updatedAt: Date.now() })
    setSaving(false)
    notify('Answer draft saved locally.', 'success')
  }

  return (
    <div className="u-col u-gap-3">
      <Field label="Your answer" htmlFor="answer-draft" hint="Plain text only. Stored in this browser.">
        <textarea id="answer-draft" className="textarea" value={body}
          onChange={(e) => setBody(e.target.value)} placeholder="Plan and write your answer here…" />
      </Field>
      <Field label="Self-assessed confidence" htmlFor="answer-confidence">
        <select id="answer-confidence" className="select" value={confidence} onChange={(e) => setConfidence(e.target.value as typeof confidence)}>
          <option value="not-sure">Could not recall</option>
          <option value="partial">Partially recalled</option>
          <option value="confident">Recalled confidently</option>
        </select>
      </Field>
      <Button variant="primary" loading={saving} onClick={() => void save()}>Save draft</Button>
    </div>
  )
}

export function PracticePage({ subjectId }: { subjectId: string }) {
  const params = useParams()
  const { notify } = useAppData()
  const targetType = params.targetType ?? 'topic'
  const targetId = params.targetId ?? ''
  const [revealed, setRevealed] = useState(false)
  const [result, setResult] = useState<RecallResult | null>(null)
  const question = targetType === 'question' ? getQuestion(targetId) : undefined
  const topic = targetType === 'topic' ? getTopic(targetId) : undefined
  const subject = getSubject(subjectId)

  const title = question?.wording ?? topic?.title ?? 'Practice item not found'
  const outline = topic?.guidance
  const linkedTopic = question?.topicIds[0] ? getTopic(question.topicIds[0]) : undefined

  const assess = async (value: RecallResult) => {
    setResult(value)
    await logRecall({ subjectId: subjectId as 'crpc' | 'labour-law-1', targetId, targetType, result: value, attemptedAt: Date.now() })
    notify('Self-assessment recorded.', 'success')
  }

  if (!subject || (!question && !topic)) return <EmptyState title="Practice item not found" message="This item is not available." />
  const next = question
    ? questions[questions.findIndex((q) => q.id === question.id) + 1]
    : undefined

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: `/subjects/${subject.id}` },
        { label: 'Practice' },
      ]} />
      <div className="page__head">
        <span className="t-overline">Active recall · distraction-free</span>
        <h1 className="t-title" style={{ fontSize: 'var(--fs-xl)' }}>{title}</h1>
        {question?.marks != null && <Badge tone="info">{question.marks} marks</Badge>}
      </div>

      <Card className="surface--flat">
        <p className="t-support">Try to recall or answer before revealing the study outline. Your self-assessment is stored separately from official content.</p>
        {!revealed ? (
          <div className="u-center" style={{ minHeight: 180 }}>
            <Button variant="primary" size="lg" icon={<Eye size={18} />} onClick={() => setRevealed(true)}>Reveal study outline</Button>
          </div>
        ) : (
          <div className="u-mt-4">
            {outline ? (
              <div className="u-col u-gap-3">
                {outline.concepts.map((c) => <p className="t-body" key={c}>• {c}</p>)}
                {outline.approach && <div className="legal-block"><h4>Answer approach</h4><p className="t-body">{outline.approach}</p></div>}
              </div>
            ) : linkedTopic ? (
              <div className="alert alert--warning">
                <span>No verified study outline is available. <Link to={`/subjects/${subject.id}/topics/${linkedTopic.id}`}>Open the related syllabus topic ({linkedTopic.code})</Link> for the source wording and linked questions.</span>
              </div>
            ) : (
              <p className="t-support">No verified study outline is available for this item.</p>
            )}
          </div>
        )}
      </Card>

      <Card title="Self-assessment">
        <div className="u-row u-row--wrap">
          {([['could-not', 'Could not recall'], ['partial', 'Partially recalled'], ['confident', 'Recalled confidently']] as const).map(([value, label]) => (
            <Button key={value} variant={result === value ? 'pressed' : 'secondary'} onClick={() => void assess(value)}>{label}</Button>
          ))}
        </div>
        <p className="t-meta u-mt-4">This is your own assessment, not an automatic evaluation of answer quality.</p>
      </Card>

      <div className="u-row u-row--wrap">
        {question && <Link to={`/subjects/${subject.id}/questions/${question.id}`} className="btn btn--secondary">Question details</Link>}
        {linkedTopic && <Link to={`/subjects/${subject.id}/topics/${linkedTopic.id}`} className="btn btn--secondary">Study topic</Link>}
        {next && <Link to={`/subjects/${subject.id}/practice/question/${next.id}`} className="btn btn--primary">Next question</Link>}
      </div>
    </div>
  )
}
