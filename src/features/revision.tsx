import { Link } from 'react-router-dom'
import { BookOpen, CalendarClock, Flag, ListChecks, Play } from 'lucide-react'
import { Badge, Breadcrumbs, Card, EmptyState, Progress } from '@/components/ui/UI'
import { QuestionList, TopicRow } from '@/components/academic/Academic'
import { getQuestion, getSubject, getTopic, subjects, topicsFor } from '@/content'
import { useAppData } from '@/hooks/useAppData'
import { REVISION_STAGES } from '@/types/domain'
import { dueTopics, subjectProgress } from '@/utils/progress'

function Centre({ subjectId }: { subjectId?: string }) {
  const { revisions, bookmarks, settings } = useAppData()
  const list = subjectId ? subjects.filter((s) => s.id === subjectId) : subjects
  const scoped = revisions.filter((r) => !subjectId || r.subjectId === subjectId)
  const due = list.flatMap((s) => dueTopics(s.id, revisions, settings.reviewIntervalDays))
  const difficult = scoped.filter((r) => r.difficult)
  const started = scoped.filter((r) => r.stage !== 'not-studied').length
  const finished = scoped.filter((r) => r.stage === 'final-revision').length
  const savedQuestions = bookmarks.filter((b) => b.kind === 'question' && (!subjectId || b.subjectId === subjectId))
  const practiceQuestions = savedQuestions.map((b) => getQuestion(b.targetId)).filter(Boolean).slice(0, 10)
  const uncompleted = list.flatMap((s) => topicsFor(s.id)).filter((t) =>
    !revisions.find((r) => r.key === `${t.subjectId}:${t.id}`) || revisions.find((r) => r.key === `${t.subjectId}:${t.id}`)?.stage === 'not-studied')

  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Personal preparation</span>
        <h1 className="t-title">Revision Centre{subjectId ? ` — ${getSubject(subjectId)?.shortName}` : ''}</h1>
        <p className="t-subtitle">All queues are built from your saved records. Nothing here is generated or inferred.</p>
      </div>

      <div className="u-grid u-grid--3">
        <Card className="card--compact" title="Topics started"><span className="t-topic">{started}</span></Card>
        <Card className="card--compact" title="Final revision completed"><span className="t-topic">{finished}</span></Card>
        <Card className="card--compact" title="Review interval"><span className="t-topic">{settings.reviewIntervalDays} days</span><span className="t-support">Change in Settings</span></Card>
      </div>

      <div className="u-grid u-grid--2">
        <Card title={<span className="u-row u-gap-2"><Play size={18} /> Continue studying</span>}>
          {started === 0 ? <EmptyState title="Nothing started yet" message="Open a syllabus topic and set a study status." /> :
            <ul className="list">{scoped.filter((r) => r.stage !== 'not-studied').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5).map((r) => {
              const t = getTopic(r.targetId)
              return <li className="list-item" key={r.key}>
                <span className="list-item__main">
                  <span className="t-label">{t?.code}</span>
                  <p className="list-item__title u-wrap-anywhere">{t?.title ?? r.targetId}</p>
                  <p className="list-item__meta">{getSubject(r.subjectId)?.shortName} · {r.stage.replace('-', ' ')}</p>
                </span>
                {t && <Link to={`/subjects/${r.subjectId}/topics/${t.id}`} className="btn btn--tertiary btn--sm">Open</Link>}
              </li>
            })}</ul>}
        </Card>

        <Card title={<span className="u-row u-gap-2"><CalendarClock size={18} /> Due for revision</span>}
          subtitle={`Based on your last recorded activity and a ${settings.reviewIntervalDays}-day interval`}>
          {due.length === 0 ? <EmptyState title="Nothing due" message="No saved activity has reached the chosen review interval." /> :
            <ul className="list">{due.slice(0, 6).map((r) => {
              const t = getTopic(r.targetId)
              return <li className="list-item" key={r.key}>
                <span className="list-item__main"><span className="list-item__title u-wrap-anywhere">{t?.title ?? r.targetId}</span>
                  <span className="list-item__meta">{getSubject(r.subjectId)?.shortName}</span></span>
                <Badge tone="warning">{r.stage.replace('-', ' ')}</Badge>
              </li>
            })}</ul>}
        </Card>
      </div>

      <div className="u-grid u-grid--2">
        <Card title={<span className="u-row u-gap-2"><Flag size={18} /> Difficult topics</span>}>
          {difficult.length === 0 ? <EmptyState title="No difficult topics" /> :
            <ul className="list">{difficult.map((r) => {
              const t = getTopic(r.targetId)
              return <li className="list-item" key={r.key}>
                <span className="list-item__main"><span className="list-item__title u-wrap-anywhere">{t?.title ?? r.targetId}</span>
                  <span className="list-item__meta">{getSubject(r.subjectId)?.shortName}</span></span>
                {t && <Link to={`/subjects/${r.subjectId}/topics/${t.id}`} className="btn btn--tertiary btn--sm">Review</Link>}
              </li>
            })}</ul>}
        </Card>

        <Card title={<span className="u-row u-gap-2"><BookOpen size={18} /> Uncompleted syllabus</span>}>
          {uncompleted.length === 0 ? <EmptyState title="All topics started" /> :
            <ul className="list">{uncompleted.slice(0, 8).map((t) => <TopicRow key={t.id} topic={t} subjectId={t.subjectId} showStatus={false} />)}</ul>}
        </Card>
      </div>

      <Card title={<span className="u-row u-gap-2"><Play size={18} /> Questions to practise</span>}
        subtitle="Questions you saved to bookmarks">
        {practiceQuestions.length ? <QuestionList items={practiceQuestions as NonNullable<typeof practiceQuestions[number]>[]} /> :
          <EmptyState title="No saved questions" message="Bookmark a question from the Question Bank or a paper to build this queue." />}
      </Card>

      <Card title={<span className="u-row u-gap-2"><ListChecks size={18} /> Final revision checklist</span>}
        subtitle="A consolidation view of every topic's saved stage">
        {list.map((s) => {
          const p = subjectProgress(s.id, revisions)
          return (
            <div key={s.id} className="u-mt-4">
              <div className="u-between"><span className="t-topic">{s.shortName}</span><span className="t-meta">{p.complete}/{p.total} final-revision complete</span></div>
              <div className="u-mt-2"><Progress value={p.percent} success /></div>
              <div className="u-row u-row--wrap u-mt-2">
                {REVISION_STAGES.slice(1).map((stage) => (
                  <Badge key={stage.id} tone={revisions.some((r) => r.subjectId === s.id && r.stage === stage.id) ? 'success' : 'neutral'}>
                    {stage.label.replace(' Completed', '')}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

export function RevisionCentrePage() { return <Centre /> }

export function SubjectRevisionPage({ subjectId }: { subjectId: string }) {
  const subject = getSubject(subjectId)
  if (!subject) return <EmptyState title="Subject not found" />
  return (
    <>
      <Breadcrumbs items={[{ label: 'Subjects', to: '/subjects' }, { label: subject.shortName, to: `/subjects/${subject.id}` }, { label: 'Revision Centre' }]} />
      <Centre subjectId={subject.id} />
    </>
  )
}
