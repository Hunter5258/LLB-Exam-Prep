import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarClock, Flag, GraduationCap, Layers3, NotebookPen, Sparkles } from 'lucide-react'
import { Badge, Card, EmptyState, Progress, ProgressRing, Spinner } from '@/components/ui/UI'
import { MappingNote, TopicRow } from '@/components/academic/Academic'
import { getSubject, getTopic, papersFor, predictionsFor, subjects, topicsFor } from '@/content'
import { useAppData } from '@/hooks/useAppData'
import { subjectProgress } from '@/utils/progress'

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="t-support u-row u-gap-2" style={{ textDecoration: 'none' }}>
    {children} <ArrowRight size={14} aria-hidden="true" />
  </Link>
}

export function HomePage() {
  const { ready, revisions, notes } = useAppData()
  const overall = subjects.reduce((acc, s) => {
    const p = subjectProgress(s.id, revisions)
    return { total: acc.total + p.total, percent: acc.percent + p.percent }
  }, { total: 0, percent: 0 })
  const overallPercent = subjects.length ? Math.round(overall.percent / subjects.length) : 0

  const difficult = revisions.filter((r) => r.difficult).slice(0, 5)
  const incomplete = subjects.flatMap((s) => topicsFor(s.id)).filter((t) =>
    revisions.find((r) => r.key === `${t.subjectId}:${t.id}`)?.stage === 'not-studied' || !revisions.find((r) => r.key === `${t.subjectId}:${t.id}`)
  ).slice(0, 5)
  const topPredictions = subjects.flatMap((s) => predictionsFor(s.id).slice(0, 3))

  if (!ready) return <Spinner />
  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Your study workspace</span>
        <h1 className="t-title">Welcome back</h1>
        <p className="t-subtitle">Continue from where you left off, or choose what to revise today.</p>
      </div>

      <div className="u-grid u-grid--auto">
        <Card className="u-grid" title={<span className="u-row u-gap-2"><GraduationCap size={18} /> Overall study progress</span>}>
          <div className="u-row u-gap-6" style={{ alignItems: 'center' }}>
            <ProgressRing value={overallPercent} size={84} />
            <div className="u-grow u-col u-gap-2">
              <span className="t-support">{overall.total} official syllabus topics across {subjects.length} subjects</span>
              <Progress value={overallPercent} label="Syllabus coverage" />
            </div>
          </div>
        </Card>
        <Card title={<span className="u-row u-gap-2"><NotebookPen size={18} /> Personal notes</span>}>
          <p className="t-body" style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700 }}>{notes.length}</p>
          <p className="t-support">Notes you have saved remain in this browser only. Export a backup from Settings.</p>
          <SectionLink to="/notes">Open my notes</SectionLink>
        </Card>
      </div>

      <section>
        <div className="page__head-row u-mb-4">
          <h2 className="t-section">My Subjects</h2>
          <SectionLink to="/subjects">View all</SectionLink>
        </div>
        <div className="u-grid u-grid--2">
          {subjects.map((s) => {
            const p = subjectProgress(s.id, revisions)
            return (
              <Card key={s.id} title={<span className="u-row u-gap-2"><BookOpen size={18} />{s.shortName}</span>}
                subtitle={`${s.name} · Paper ${s.paperCode} · ${s.semester}`}>
                <p className="t-support u-wrap-anywhere">{s.description}</p>
                <div className="u-mt-4"><Progress value={p.percent} label={`${p.started} of ${p.total} topics started`} /></div>
                <div className="u-row u-gap-2 u-mt-4">
                  <Link to={`/subjects/${s.id}`} className="btn btn--primary btn--sm">Enter subject</Link>
                  <Link to={`/subjects/${s.id}/syllabus`} className="btn btn--secondary btn--sm">Open syllabus</Link>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <div className="u-grid u-grid--2">
        <Card title={<span className="u-row u-gap-2"><CalendarClock size={18} /> Today's revision</span>}
          subtitle="Recorded study activity — no automated scheduling is claimed">
          {revisions.filter((r) => r.stage !== 'not-studied').length === 0 ? (
            <EmptyState title="No revision due" message="Mark a topic as studied to see it here." />
          ) : (
            <ul className="list">
              {revisions.filter((r) => r.stage !== 'not-studied').slice(0, 5).map((r) => (
                <li className="list-item" key={r.key}>
                  <div className="list-item__main">
                    <p className="list-item__title">{getTopic(r.targetId)?.title ?? getSubject(r.subjectId)?.shortName ?? r.targetId}</p>
                    <p className="list-item__meta">{getSubject(r.subjectId)?.shortName} · {r.stage.replace('-', ' ')}</p>
                  </div>
                  <Link to={`/subjects/${r.subjectId}/topics/${r.targetId}`} className="btn btn--tertiary btn--sm">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={<span className="u-row u-gap-2"><Flag size={18} /> Difficult topics</span>}>
          {difficult.length === 0 ? (
            <EmptyState title="Nothing marked difficult" message="Mark a topic as difficult from its study page." />
          ) : (
            <ul className="list">{difficult.map((r) => (
              <li className="list-item" key={r.key}>
                <span className="list-item__main list-item__title u-wrap-anywhere">{getTopic(r.targetId)?.title ?? r.targetId}</span>
                <Badge tone="danger">{getSubject(r.subjectId)?.shortName}</Badge>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>

      <div className="u-grid u-grid--2">
        <Card title={<span className="u-row u-gap-2"><Sparkles size={18} /> Important questions</span>}
          subtitle="Top-ranked items from the verified prediction reports">
          <ul className="list">{topPredictions.map((p) => (
            <li className="list-item" key={p.id}>
              <div className="list-item__main">
                <p className="list-item__title u-wrap-anywhere u-clamp-2">{p.title}</p>
                <p className="list-item__meta">{getSubject(p.subjectId)?.shortName} · rank {p.rank} · {p.rating ?? 'unrated'}</p>
              </div>
              <Link to={`/subjects/${p.subjectId}/predictions/${p.id}`} className="btn btn--tertiary btn--sm">View</Link>
            </li>
          ))}</ul>
        </Card>

        <Card title={<span className="u-row u-gap-2"><Layers3 size={18} /> Uncompleted syllabus</span>}>
          {incomplete.length === 0 ? (
            <EmptyState title="All topics started" message="Every official topic has a saved study record." />
          ) : (
            <ul className="list">{incomplete.map((t) => (
              <li className="list-item" key={t.id}>
                <span className="list-item__main">
                  <span className="t-label">{t.code}</span>
                  <p className="list-item__title u-wrap-anywhere">{t.title}</p>
                </span>
                <Link to={`/subjects/${t.subjectId}/topics/${t.id}`} className="btn btn--tertiary btn--sm">Study</Link>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export function SubjectsPage() {
  const { revisions } = useAppData()
  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Academic subjects</span>
        <h1 className="t-title">My Subjects</h1>
        <p className="t-subtitle">Two separate academic environments. Subject data is never merged.</p>
      </div>
      <div className="u-grid u-grid--2">
        {subjects.map((s) => {
          const p = subjectProgress(s.id, revisions)
          return (
            <Card key={s.id} className="card--interactive"
              title={<span className="u-row u-gap-2"><GraduationCap size={18} />{s.name}</span>}
              subtitle={`Paper ${s.paperCode} · ${s.semester} · ${s.credits} credits`}>
              <p className="t-support u-wrap-anywhere">{s.description}</p>
              <div className="u-mt-4"><Progress value={p.percent} label={`${p.complete} fully revised of ${p.total}`} /></div>
              <div className="u-row u-gap-2 u-mt-4 u-row--wrap">
                <Link to={`/subjects/${s.id}`} className="btn btn--primary btn--sm">Continue studying</Link>
                <Link to={`/subjects/${s.id}/syllabus`} className="btn btn--secondary btn--sm">Syllabus</Link>
                <Link to={`/subjects/${s.id}/papers`} className="btn btn--tertiary btn--sm">Papers</Link>
              </div>
              <p className="t-meta u-mt-4 u-wrap-anywhere">{s.sourceNote}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function SubjectOverviewPage({ subjectId }: { subjectId: string }) {
  const subject = getSubject(subjectId)
  const { revisions } = useAppData()
  if (!subject) return <EmptyState title="Subject not found" />
  const p = subjectProgress(subject.id, revisions)
  const areas = [
    { to: 'syllabus', label: 'Official Syllabus', icon: BookOpen, note: `${topicsFor(subject.id).length} official topics` },
    { to: 'papers', label: 'Historical Papers', icon: Layers3, note: `${papersFor(subject.id).length} verified years` },
    { to: 'questions', label: 'Question Bank', icon: NotebookPen, note: 'Search and filter all verified questions' },
    { to: 'predictions', label: 'Predictions', icon: Sparkles, note: 'Evidence-based, with limitations' },
    { to: 'insights', label: 'Historical Insights', icon: CalendarClock, note: 'Source-supported patterns only' },
    { to: 'revision', label: 'Revision Centre', icon: Flag, note: 'Your saved progress and queues' },
  ]
  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Paper {subject.paperCode} · {subject.semester}</span>
        <h1 className="t-title">{subject.name}</h1>
        <p className="t-subtitle">{subject.university} · {subject.programme} · {subject.fullMarks} marks [{subject.writtenMarks}+{subject.internalMarks}]</p>
      </div>
      <Card>
        <div className="u-row u-gap-6">
          <ProgressRing value={p.percent} size={72} />
          <div className="u-grow u-col u-gap-2">
            <span className="t-topic">Your progress in this subject</span>
            <Progress value={p.percent} label={`${p.started} of ${p.total} topics started`} />
          </div>
        </div>
      </Card>
      <div>
        <h2 className="t-section u-mb-4">Subject areas</h2>
        <div className="u-grid u-grid--3">
          {areas.map(({ to, label, icon: Icon, note }) => (
            <Link key={to} to={`/subjects/${subject.id}/${to}`} className="card card--interactive" style={{ color: 'inherit' }}>
              <div className="u-row u-gap-2"><Icon size={18} className="u-primary" /><span className="t-topic">{label}</span></div>
              <p className="t-support">{note}</p>
            </Link>
          ))}
        </div>
      </div>
      <Card title="Continue studying" subtitle="Official syllabus topics in their prescribed order">
        <ul className="list">{topicsFor(subject.id).slice(0, 5).map((t) => <TopicRow key={t.id} topic={t} subjectId={subject.id} />)}</ul>
      </Card>
      <MappingNote />
    </div>
  )
}
