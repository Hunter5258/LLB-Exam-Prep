import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, BarChart3, BookOpen, ExternalLink, Info, Sparkles } from 'lucide-react'
import { Badge, Breadcrumbs, Card, Disclosure, EmptyState, RatingBadge, SafeMarkdown, Tabs } from '@/components/ui/UI'
import { MappingNote } from '@/components/academic/Academic'
import { getPrediction, getSubject, getTopic, predictionsFor, questions, reportDocument, reports } from '@/content'

export function PredictionsPage({ subjectId }: { subjectId: string }) {
  const subject = getSubject(subjectId)
  const [tab, setTab] = useState('predictions')
  if (!subject) return <EmptyState title="Subject not found" />
  const report = reports.find((r) => r.subjectId === subject.id)
  const items = predictionsFor(subject.id)
  const doc = report ? reportDocument(report.id) : ''

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: `/subjects/${subject.id}` },
        { label: 'Predictions' },
      ]} />
      <div className="page__head">
        <span className="t-overline">Supplementary preparation resource</span>
        <h1 className="t-title">Predictions — 2026 preparation</h1>
        <p className="t-subtitle">Predictions are evidence-based academic estimates from verified historical papers. They are not official examination material.</p>
      </div>

      <p className="alert alert--warning"><AlertTriangle size={16} style={{ flex: 'none' }} />
        <span><strong>Ratings below describe prediction confidence and revision priority from the source report — never your mastery.</strong> Your own study status is recorded separately on topic pages and in the Revision Centre.</span>
      </p>

      <Tabs active={tab} onChange={setTab} items={[
        { id: 'predictions', label: 'Ranked predictions' },
        { id: 'report', label: 'Full source report' },
      ]} />

      {tab === 'predictions' && (
        <>
          <div className="u-grid u-grid--3">
            <Card className="card--compact" title="Report"><span className="t-topic">{report?.title ?? 'Not available'}</span><Badge tone="info">{report?.year}</Badge></Card>
            <Card className="card--compact" title="Predictions"><span className="t-topic">{items.length}</span><span className="t-support">ranked items</span></Card>
            <Card className="card--compact" title="Basis"><span className="t-support">{report?.summary}</span></Card>
          </div>
          <Card title="Ranked prediction list" subtitle="Evidence traceable to verified examination years">
            <ul className="list">
              {items.map((p) => (
                <li className="list-item" key={p.id}>
                  <Badge tone="neutral">#{p.rank}</Badge>
                  <div className="list-item__main">
                    <p className="list-item__title u-wrap-anywhere">{p.title}</p>
                    <p className="list-item__meta">Report: {p.reportId} · {p.evidence.length} cited evidence item(s)</p>
                  </div>
                  <div className="list-item__end">
                    <RatingBadge value={p.rating} />
                    {p.priority && <Badge tone={/critical/i.test(p.priority) ? 'danger' : 'neutral'}>{p.priority}</Badge>}
                    <Link to={`/subjects/${subject.id}/predictions/${p.id}`} className="btn btn--tertiary btn--sm">Details</Link>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {tab === 'report' && doc && (
        <Disclosure title={<span className="u-row u-gap-2"><BookOpen size={17} /> {report?.title} (verbatim source)</span>} defaultOpen>
          <SafeMarkdown source={doc} />
        </Disclosure>
      )}
      <MappingNote />
    </div>
  )
}

export function PredictionDetailPage({ subjectId, predictionId }: { subjectId: string; predictionId?: string }) {
  const prediction = getPrediction(predictionId)
  const subject = getSubject(subjectId)
  if (!prediction || !subject || prediction.subjectId !== subject.id) return <EmptyState title="Prediction not found" />
  const detail = reportDocument(prediction.reportId)
  const start = detail.indexOf(`### ${prediction.id.replace('LABOUR-', '').replace('CRPC-P-', '')}`)
  const slice = start >= 0 ? detail.slice(start, detail.indexOf('\n### ', start + 5) >= 0 ? detail.indexOf('\n### ', start + 5) : detail.length) : ''
  const topics = prediction.topicIds.map((id) => getTopic(id)).filter(Boolean)

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: `/subjects/${subject.id}` },
        { label: 'Predictions', to: `/subjects/${subject.id}/predictions` },
        { label: `#${prediction.rank}` },
      ]} />
      <div className="page__head">
        <span className="t-overline">Prediction #{prediction.rank} · {prediction.reportId}</span>
        <h1 className="t-title" style={{ fontSize: 'var(--fs-xl)' }}>{prediction.title}</h1>
        <div className="u-row u-row--wrap">
          <RatingBadge value={prediction.rating} />
          {prediction.priority && <Badge tone="neutral">Revision priority: {prediction.priority}</Badge>}
          <Badge tone="outline">Prediction — not official material</Badge>
        </div>
      </div>

      <Card title="Predicted question (as printed in the report)">
        <p className="t-body u-wrap-anywhere">{prediction.question}</p>
      </Card>

      <div className="u-grid u-grid--2">
        <Card title="Historical evidence" subtitle="Each year links to the verified question record where available">
          {prediction.evidence.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Year</th><th>Question</th><th>Marks</th></tr></thead>
                <tbody>
                  {prediction.evidence.map((e, i) => {
                    const q = questions.find((x) => x.subjectId === subject.id && x.year === e.year && `Q${x.number}${x.subNumber ? `(${x.subNumber})` : ''}` === `Q${e.questionNumber}`)
                    return (
                      <tr key={i}>
                        <td>{e.year}</td>
                        <td>{q ? <Link to={`/subjects/${subject.id}/questions/${q.id}`}>{e.questionNumber} <ExternalLink size={12} /></Link> : e.questionNumber}</td>
                        <td>{e.marks ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="t-support">No individual evidence items were extracted; inspect the full source report for the evidence dossier.</p>}
        </Card>

        <Card title="Related syllabus topics">
          {topics.length ? <ul className="list">{topics.map((t) => (
            <li className="list-item" key={t!.id}>
              <span className="list-item__main"><span className="t-label">{t!.code}</span><p className="list-item__title u-wrap-anywhere">{t!.title}</p></span>
              <Link to={`/subjects/${subject.id}/topics/${t!.id}`} className="btn btn--tertiary btn--sm">Study</Link>
            </li>
          ))}</ul> : <p className="t-support">No topic association recorded.</p>}
        </Card>
      </div>

      {(prediction.scope || prediction.uncertainty) && (
        <div className="u-grid u-grid--2">
          {prediction.scope && <Card title="Preparation scope"><p className="t-body">{prediction.scope}</p></Card>}
          {prediction.uncertainty && <Card title="Uncertainty"><p className="t-body">{prediction.uncertainty}</p></Card>}
        </div>
      )}

      {slice && <Disclosure title={<span className="u-row u-gap-2"><Info size={17} /> Full reasoning from the source report</span>}><SafeMarkdown source={slice} /></Disclosure>}
    </div>
  )
}

export function InsightsPage({ subjectId }: { subjectId: string }) {
  const subject = getSubject(subjectId)
  if (!subject) return <EmptyState title="Subject not found" />
  const items = questions.filter((q) => q.subjectId === subject.id)
  const byYear = Object.entries(items.reduce<Record<string, number>>((acc, q) => {
    acc[q.year] = (acc[q.year] ?? 0) + 1; return acc
  }, {})).sort(([a], [b]) => a.localeCompare(b))
  const max = Math.max(...byYear.map(([, n]) => n), 1)
  const predictions = predictionsFor(subject.id)
  const top = predictions.slice(0, 8)

  return (
    <div className="page">
      <Breadcrumbs items={[
        { label: 'Subjects', to: `/subjects/${subject.id}` },
        { label: 'Historical Insights' },
      ]} />
      <div className="page__head">
        <span className="t-overline">Source-supported information only</span>
        <h1 className="t-title">Historical Insights</h1>
        <p className="t-subtitle">Counts are derived directly from verified question records. No data has been fabricated.</p>
      </div>

      <Card title={<span className="u-row u-gap-2"><BarChart3 size={18} /> Verified questions by examination year</span>}
        subtitle={`${items.length} question records for ${subject.shortName}`}>
        <ul className="list">
          {byYear.map(([year, count]) => (
            <li className="list-item" key={year}>
              <Badge tone="neutral" year>{year}</Badge>
              <div className="u-grow">
                <div className="progress" aria-label={`${year}: ${count} questions`}>
                  <div className="progress__bar" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
              <span className="t-meta">{count}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={<span className="u-row u-gap-2"><Sparkles size={18} /> Highest-ranked predictions</span>}
        subtitle="Prediction confidence — not student mastery">
        <ul className="list">{top.map((p) => (
          <li className="list-item" key={p.id}>
            <Badge tone="neutral">#{p.rank}</Badge>
            <span className="list-item__main list-item__title u-wrap-anywhere">{p.title}</span>
            <RatingBadge value={p.rating} />
          </li>
        ))}</ul>
      </Card>

      {reports.filter((r) => r.subjectId === subject.id).map((r) => (
        <Disclosure key={r.id} title={<span className="u-row u-gap-2"><BookOpen size={17} /> {r.title} — methodology and limitations</span>}>
          <SafeMarkdown source={reportDocument(r.id)} />
        </Disclosure>
      ))}
      <p className="legal-note"><Info size={15} style={{ flex: 'none' }} /> Charts use only verified counts. Percentages, probabilities or mastery scores are not inferred from historical frequency.</p>
    </div>
  )
}

export function PredictionRoute() {
  const { subjectId, predictionId } = useParams()
  return <PredictionDetailPage subjectId={subjectId ?? ''} predictionId={predictionId} />
}
