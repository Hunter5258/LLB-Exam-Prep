import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, BookOpen, FileText, Info, Scale, ScrollText } from 'lucide-react'
import { Badge, Breadcrumbs, Button, Card, Disclosure, EmptyState, Field, Progress, SafeMarkdown, Spinner } from '@/components/ui/UI'
import {
  BookmarkButton, DifficultButton, MappingNote, QuestionList, RevisionControls, RevisionSelect, TopicRow,
} from '@/components/academic/Academic'
import {
  documents, getSubject, getTopic, papersFor, predictionsFor, questionsForTopic,
  topicsFor, topicsInUnit, unitsFor,
} from '@/content'
import { notesFor, saveNote } from '@/database/db'
import { useAppData } from '@/hooks/useAppData'
import { subjectProgress } from '@/utils/progress'

export function SyllabusPage({ subjectId }: { subjectId: string }) {
  const subject = getSubject(subjectId)
  const { revisions } = useAppData()
  if (!subject) return <EmptyState title="Subject not found" />
  const units = unitsFor(subject.id)
  const topics = topicsFor(subject.id)
  const progress = subjectProgress(subject.id, revisions)
  const official = documents[`${subject.id}/${subject.id === 'crpc' ? 'syllaub.md' : 'syllabus.md'}`]

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: '/subjects' },
        { label: subject.shortName, to: `/subjects/${subject.id}` },
        { label: 'Official Syllabus' },
      ]} />
      <div className="page__head">
        <span className="t-overline">Official university syllabus</span>
        <h1 className="t-title">Syllabus — {subject.name}</h1>
        <p className="t-subtitle">The syllabus is the organising structure of this subject. Unit and topic wording is preserved from the verified source.</p>
      </div>

      <Card>
        <div className="u-row u-gap-6">
          <Progress value={progress.percent} label={`${progress.started} of ${progress.total} topics started`} />
          <Badge tone="info">{units.length} units</Badge>
          <Badge tone="neutral">{topics.length} topics</Badge>
        </div>
      </Card>

      <div className="u-grid u-grid--2">
        {units.map((unit) => {
          const unitTopics = topicsInUnit(unit.id)
          const started = unitTopics.filter((t) => revisions.find((r) => r.key === `${subject.id}:${t.id}`)?.stage !== 'not-studied').length
          return (
            <Card key={unit.id} title={<span className="u-row u-gap-2"><span className="t-label">Unit {unit.number}</span>{unit.title}</span>}
              subtitle={`${unitTopics.length} topics · ${unit.marks} marks${started ? ` · ${started} started` : ''}`}>
              <ul className="list">{unitTopics.map((t) => <TopicRow key={t.id} topic={t} subjectId={subject.id} />)}</ul>
            </Card>
          )
        })}
      </div>

      <Disclosure title={<span className="u-row u-gap-2"><ScrollText size={17} /> Full official syllabus wording</span>}>
        {official ? <SafeMarkdown source={official.slice(official.indexOf('#'), official.indexOf('## C.') > 0 ? official.indexOf('## C.') : undefined)} />
          : <p className="t-support">The source document is not available.</p>}
      </Disclosure>
      <MappingNote />
    </div>
  )
}

export function TopicStudyPage({ subjectId, topicId }: { subjectId: string; topicId?: string }) {
  const topic = getTopic(topicId)
  const subject = getSubject(subjectId)
  const { ready, revisions, notes, visit, notify } = useAppData()
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (topic && subject) visit(subject.id, 'topic', topic.id, topic.title)
  }, [topic, subject, visit])

  useEffect(() => {
    if (!topic) return
    let active = true
    void notesFor('topic', topic.id).then((list) => { if (active) setDraft(list[0]?.body ?? '') })
    return () => { active = false }
  }, [topic])

  if (!ready) return <Spinner />
  if (!topic || !subject || topic.subjectId !== subject.id) return <EmptyState title="Topic not found" message="This topic is not part of the selected subject." />
  const unit = unitsFor(subject.id).find((u) => u.id === topic.unitId)
  const questions = questionsForTopic(topic.id)
  const linkedPredictions = predictionsFor(subject.id).filter((p) => p.topicIds.includes(topic.id))
  const byYear = [...new Set(questions.map((q) => q.year))].sort((a, b) => a - b)
  const stage = revisions.find((r) => r.key === `${subject.id}:${topic.id}`)?.stage ?? 'not-studied'
  const note = notes.find((n) => n.targetType === 'topic' && n.targetId === topic.id)
  const nextTopic = topicsFor(subject.id)[topicsFor(subject.id).findIndex((t) => t.id === topic.id) + 1]

  const sections: { id: string; label: string; show: boolean }[] = [
    { id: 'material', label: 'Study Material', show: Boolean(topic.guidance) },
    { id: 'legislation', label: 'Relevant Legislation', show: topic.sectionRefs.length > 0 || topic.referredCases.length > 0 },
    { id: 'questions', label: 'Previous Examination Questions', show: questions.length > 0 },
    { id: 'predictions', label: 'Predicted Questions', show: linkedPredictions.length > 0 },
    { id: 'notes', label: 'Personal Notes & Revision', show: true },
  ]

  const save = async () => {
    setSaving(true)
    await saveNote({
      id: note?.id ?? `${subject.id}:topic:${topic.id}`,
      subjectId: subject.id, targetType: 'topic', targetId: topic.id,
      body: draft, createdAt: note?.createdAt ?? Date.now(), updatedAt: Date.now(),
    })
    setSaving(false)
    notify('Note saved in this browser.', 'success')
  }

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: '/subjects' },
        { label: subject.shortName, to: `/subjects/${subject.id}` },
        { label: 'Syllabus', to: `/subjects/${subject.id}/syllabus` },
        { label: unit ? `Unit ${unit.number}` : topic.code },
        { label: topic.code },
      ]} />
      <div className="page__head">
        <span className="t-overline">{unit ? `UNIT ${unit.number} — ${unit.title}` : 'SYLLABUS TOPIC'} · {topic.code}</span>
        <h1 className="t-title">{topic.title}</h1>
        <p className="t-support">Official syllabus wording, reproduced from the verified source. Derived guidance is labelled and is not prescribed material.</p>
      </div>

      <div className="u-row u-row--wrap">
        <Badge tone={stage === 'not-studied' ? 'neutral' : 'success'}>{stage.replace('-', ' ')}</Badge>
        <BookmarkButton subjectId={subject.id} kind="topic" targetId={topic.id} />
        <DifficultButton subjectId={subject.id} targetId={topic.id} />
        <Link to={`/subjects/${subject.id}/practice/topic/${topic.id}`} className="btn btn--primary btn--sm">Practise active recall</Link>
      </div>
      <RevisionControls subjectId={subject.id} targetId={topic.id} />

      <div className="split-layout u-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px', alignItems: 'start' }}>
        <div className="u-col u-gap-6">
          {sections.filter((s) => s.show).length > 1 && (
            <Card title="On this page" className="surface--inset-sm">
              <ul className="list">{sections.filter((s) => s.show).map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="t-support">{s.label}</a></li>
              ))}</ul>
            </Card>
          )}

          <section id="material" className="surface surface--flat" style={{ padding: 'var(--sp-6)', borderRadius: 'var(--r-4)' }}>
            <h2 className="t-section u-mb-4"><BookOpen size={18} style={{ display: 'inline', verticalAlign: '-2px' }} /> Study Material</h2>
            {topic.guidance ? (
              <>
                <p className="alert alert--warning">
                  <Info size={16} style={{ flex: 'none' }} />
                  <span>Examination-oriented guidance derived from the verified source. It is <strong>not part of the officially prescribed syllabus</strong> and introduces no new statutory section numbers or case holdings.</span>
                </p>
                <div className="u-col u-gap-4 u-mt-4">
                  {topic.guidance.concepts.length > 0 && (
                    <div className="legal-block"><h4>Concepts to understand</h4><ul>{topic.guidance.concepts.map((c) => <li key={c}>{c}</li>)}</ul></div>
                  )}
                  {topic.guidance.provisions.length > 0 && (
                    <div className="legal-block"><h4>Statutory framework (source subject matter only)</h4><ul>{topic.guidance.provisions.map((c) => <li key={c}>{c}</li>)}</ul></div>
                  )}
                  {topic.guidance.distinctions.length > 0 && (
                    <div className="legal-block"><h4>Legal distinctions</h4><ul>{topic.guidance.distinctions.map((c) => <li key={c}>{c}</li>)}</ul></div>
                  )}
                  {topic.guidance.approach && (
                    <div className="legal-block"><h4>Answer-preparation approach</h4><p className="t-body">{topic.guidance.approach}</p></div>
                  )}
                </div>
              </>
            ) : (
              <EmptyState icon={<AlertTriangle size={24} />} title="Study material not yet available"
                message="No verified academic explanation has been supplied for this topic. Use the official syllabus wording and the linked historical questions instead. No legal content has been invented." />
            )}
          </section>

          {sections.find((s) => s.id === 'legislation')?.show && (
            <section id="legislation">
              <h2 className="t-section u-mb-4"><Scale size={18} style={{ display: 'inline', verticalAlign: '-2px' }} /> Relevant Legislation &amp; Authorities</h2>
              <Card>
                {topic.sectionRefs.length > 0 && (
                  <>
                    <h3 className="t-topic">Statutory references as printed</h3>
                    <div className="u-row u-row--wrap u-mt-2">{topic.sectionRefs.map((ref, i) => <span className="legal-ref" key={i}>{ref}</span>)}</div>
                  </>
                )}
                {topic.referredCases.length > 0 && (
                  <div className="u-mt-4">
                    <h3 className="t-topic">Referred cases (official)</h3>
                    <ul className="list u-mt-2">{topic.referredCases.map((c) => <li className="list-item" key={c}><span className="t-support u-wrap-anywhere">{c}</span></li>)}</ul>
                  </div>
                )}
                {topic.sectionRefs.length === 0 && topic.referredCases.length === 0 && (
                  <p className="t-support">No statutory reference or referred case is printed against this topic in the source syllabus.</p>
                )}
              </Card>
            </section>
          )}

          {questions.length > 0 && (
            <section id="questions">
              <h2 className="t-section u-mb-4"><FileText size={18} style={{ display: 'inline', verticalAlign: '-2px' }} /> Previous Examination Questions</h2>
              <MappingNote />
              {byYear.map((year) => (
                <Disclosure key={year} title={<span className="u-row u-gap-2"><Badge tone="neutral" year>{year}</Badge><span className="t-support">{questions.filter((q) => q.year === year).length} question(s)</span></span>}>
                  <QuestionList items={questions.filter((q) => q.year === year)} />
                </Disclosure>
              ))}
            </section>
          )}

          {linkedPredictions.length > 0 && (
            <section id="predictions">
              <h2 className="t-section u-mb-4">Predicted Questions</h2>
              <ul className="list">{linkedPredictions.slice(0, 8).map((p) => (
                <li className="list-item" key={p.id}>
                  <div className="list-item__main">
                    <p className="list-item__title u-wrap-anywhere">{p.title}</p>
                    <p className="list-item__meta">Rank {p.rank} · {p.rating ?? 'unrated'} · prediction, not official material</p>
                  </div>
                  <Link to={`/subjects/${subject.id}/predictions/${p.id}`} className="btn btn--tertiary btn--sm">Evidence</Link>
                </li>
              ))}</ul>
            </section>
          )}

          <section id="notes">
            <h2 className="t-section u-mb-4">Personal Notes &amp; Revision</h2>
            <Card>
              <RevisionSelect subjectId={subject.id} targetId={topic.id} />
              <div className="u-mt-4">
                <Field label="Your notes" htmlFor="topic-note" hint="Saved locally in this browser only.">
                  <textarea id="topic-note" className="textarea" value={draft}
                    onChange={(e) => setDraft(e.target.value)} placeholder="Write your revision notes for this topic…" />
                </Field>
                <div className="u-mt-2"><Button variant="primary" loading={saving} onClick={() => void save()}>Save note</Button></div>
              </div>
            </Card>
          </section>

          {nextTopic && (
            <Link to={`/subjects/${subject.id}/topics/${nextTopic.id}`} className="btn btn--secondary">
              Next topic: {nextTopic.code} <span className="u-truncate">{nextTopic.title}</span>
            </Link>
          )}
        </div>

        <aside className="sticky-toc" style={{ position: 'sticky', top: 'calc(var(--topbar-height) + var(--sp-4))' }}>
          <Card title="On this page" inset>
            <ul className="list">
              {sections.filter((s) => s.show).map((s) => <li key={s.id}><a href={`#${s.id}`} className="t-support">{s.label}</a></li>)}
            </ul>
            <div className="divider" />
            <p className="t-meta">{papersFor(subject.id).length} verified papers · {questions.length} linked questions</p>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export function TopicRoute() {
  const { subjectId, topicId } = useParams()
  return <TopicStudyPage subjectId={subjectId ?? ''} topicId={topicId} />
}
