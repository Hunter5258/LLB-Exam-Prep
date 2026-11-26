import { Link } from 'react-router-dom'
import { Archive, CalendarX2, ChevronRight, Clock3, FileText } from 'lucide-react'
import { Badge, Breadcrumbs, Card, Disclosure, EmptyState, SafeMarkdown } from '@/components/ui/UI'
import { MappingNote, QuestionList } from '@/components/academic/Academic'
import { getSubject, paperDocument, papersFor, questionsForPaper } from '@/content'
import type { Paper } from '@/types/domain'

function paperMarkdown(paper: Paper): string {
  const doc = paperDocument(paper) ?? ''
  if (paper.subjectId === 'labour-law-1') {
    const start = doc.indexOf(`## ${paper.year} Examination`)
    const next = doc.indexOf('\n## ', start + 5)
    return start >= 0 ? doc.slice(start, next >= 0 ? next : doc.length) : doc
  }
  return doc
}

export function PapersPage({ subjectId }: { subjectId: string }) {
  const subject = getSubject(subjectId)
  if (!subject) return <EmptyState title="Subject not found" />
  const available = papersFor(subject.id)
  const first = Math.min(...available.map((p) => p.year))
  const last = Math.max(...available.map((p) => p.year))
  const missing: number[] = []
  for (let y = first; y <= last; y++) if (!available.some((p) => p.year === y)) missing.push(y)

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: '/subjects' },
        { label: subject.shortName, to: `/subjects/${subject.id}` },
        { label: 'Previous Question Papers' },
      ]} />
      <div className="page__head">
        <span className="t-overline">Examination archive</span>
        <h1 className="t-title">Previous Question Papers</h1>
        <p className="t-subtitle">Original question wording is reproduced verbatim. Unavailable years are shown as unavailable — no paper is reconstructed.</p>
      </div>

      <Card title={<span className="u-row u-gap-2"><Archive size={18} /> Verified years</span>}
        subtitle={`${available.length} papers available · ${missing.length} unavailable year(s) in range`}>
        <ul className="list">
          {available.map((p) => (
            <li className="list-item list-item--click" key={p.id}>
              <Link to={`/subjects/${subject.id}/papers/${p.id}`} className="u-row u-grow" style={{ color: 'inherit', gap: 'var(--sp-3)' }}>
                <Badge tone="primary" year>{p.year}</Badge>
                <span className="list-item__main">
                  <span className="list-item__title">{p.examTitle}</span>
                  <span className="list-item__meta">
                    Paper {p.paperCode} · {p.marks} marks · {p.duration}
                    {p.heldIn ? ` · held in ${p.heldIn}` : ''}
                  </span>
                </span>
              </Link>
              <span className="u-row u-gap-2">
                <Badge tone="outline">{questionsForPaper(p.id).length} questions</Badge>
                <ChevronRight size={16} className="u-muted" aria-hidden="true" />
              </span>
            </li>
          ))}
          {missing.map((y) => (
            <li className="list-item surface--inset" key={`missing-${y}`}>
              <Badge tone="neutral" year>{y}</Badge>
              <span className="list-item__main">
                <span className="list-item__title u-muted">Not available</span>
                <span className="list-item__meta">No verified source paper exists for this year.</span>
              </span>
              <CalendarX2 size={17} className="u-muted" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </Card>
      {subject.id === 'crpc' && (
        <p className="legal-note">
          The file <code>question_paper_2021-23.md</code> prints the year <strong>2022</strong> (held in 2023). It is listed under 2022 here. There is no separate 2023 paper.
        </p>
      )}
      {subject.id === 'labour-law-1' && (
        <p className="legal-note">The 2022 examination has no source paper and is deliberately omitted. The 2020 paper was held in 2021 and the 2021 paper in 2022; both are filed under their printed year.</p>
      )}
    </div>
  )
}

export function PaperDetailPage({ subjectId, paperId }: { subjectId: string; paperId?: string }) {
  const subject = getSubject(subjectId)
  const paper = (subject ? papersFor(subject.id) : []).find((p) => p.id === paperId)
  if (!subject || !paper) return <EmptyState title="Paper not found" message="This examination paper is not available." />
  const questions = questionsForPaper(paper.id)
  const sections = [...new Set(questions.map((q) => q.section))]

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: `/subjects/${subject.id}` },
        { label: 'Papers', to: `/subjects/${subject.id}/papers` },
        { label: `${paper.year}` },
      ]} />
      <div className="page__head">
        <span className="t-overline">Historical examination paper</span>
        <h1 className="t-title">{paper.year} Examination — {subject.name}</h1>
        <p className="t-subtitle">{paper.examTitle}</p>
      </div>

      <div className="u-grid u-grid--4">
        <Card className="card--compact" title="Year"><span className="t-topic">{paper.year}{paper.heldIn ? ` (held ${paper.heldIn})` : ''}</span></Card>
        <Card className="card--compact" title="Paper"><span className="t-topic">{paper.paperCode}</span></Card>
        <Card className="card--compact" title="Maximum marks"><span className="t-topic">{paper.marks}</span></Card>
        <Card className="card--compact" title="Duration"><span className="u-row u-gap-2"><Clock3 size={16} />{paper.duration}</span></Card>
      </div>
      {paper.note && <p className="alert alert--warning"><FileText size={16} style={{ flex: 'none' }} />{paper.note}</p>}

      <section className="surface surface--flat" style={{ padding: 'var(--sp-6)', borderRadius: 'var(--r-4)' }}>
        <h2 className="t-section u-mb-4">Original paper</h2>
        <SafeMarkdown source={paperMarkdown(paper)} />
      </section>

      <MappingNote />
      <section>
        <h2 className="t-section u-mb-4">Question navigation &amp; topic links</h2>
        {sections.map((section) => (
          <Disclosure key={section} title={section} defaultOpen={sections.length === 1}>
            <QuestionList items={questions.filter((q) => q.section === section)} showPaper={false} />
          </Disclosure>
        ))}
      </section>
    </div>
  )
}
