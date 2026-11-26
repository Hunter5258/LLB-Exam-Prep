import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bookmark, Clock3, FileSearch, NotebookPen, Search } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Spinner } from '@/components/ui/UI'
import { BookmarkButton } from '@/components/academic/Academic'
import { getPrediction, getSubject, getTopic } from '@/content'
import { db, saveNote } from '@/database/db'
import { useAppData } from '@/hooks/useAppData'
import { search, type SearchFilters } from '@/services/search'
import type { HistoryEntry, Note } from '@/types/domain'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useState(params.get('q') ?? '')
  const [filters, setFilters] = useState<SearchFilters>({
    subjectId: (params.get('subject') as SearchFilters['subjectId']) || 'all',
    kind: (params.get('type') as SearchFilters['kind']) || 'all',
    year: params.get('year') ?? '',
  })
  const results = useMemo(() => search(term, filters), [term, filters])

  const update = (key: keyof SearchFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }))
    const next = new URLSearchParams(params)
    if (value && value !== 'all') next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Global search</span>
        <h1 className="t-title">Search</h1>
        <p className="t-subtitle">Searches subjects, topics, questions, papers and predictions from the local academic index.</p>
      </div>
      <Card>
        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <Search size={18} aria-hidden="true" />
          <label className="u-sr-only" htmlFor="search-input">Search query</label>
          <input id="search-input" className="input" value={term} autoFocus
            placeholder="Search e.g. anticipation bail, Factories Act, 2019…"
            onChange={(e) => { setTerm(e.target.value); const next = new URLSearchParams(params); next.set('q', e.target.value); setParams(next, { replace: true }) }} />
        </form>
        <div className="u-row u-row--wrap u-mt-4">
          <Field label="Subject" htmlFor="search-subject">
            <select id="search-subject" className="select" value={filters.subjectId} onChange={(e) => update('subjectId', e.target.value)}>
              <option value="all">All subjects</option>
              <option value="crpc">CrPC</option>
              <option value="labour-law-1">Labour Law I</option>
            </select>
          </Field>
          <Field label="Content type" htmlFor="search-kind">
            <select id="search-kind" className="select" value={filters.kind} onChange={(e) => update('kind', e.target.value)}>
              <option value="all">All types</option>
              <option value="subject">Subject</option>
              <option value="topic">Topic</option>
              <option value="question">Question</option>
              <option value="paper">Paper</option>
              <option value="prediction">Prediction</option>
            </select>
          </Field>
          <Field label="Year" htmlFor="search-year">
            <input id="search-year" className="input" value={filters.year} placeholder="e.g. 2019"
              onChange={(e) => update('year', e.target.value)} />
          </Field>
        </div>
      </Card>
      <p className="t-support"><strong>{results.length}</strong> result(s)</p>
      {results.length === 0 ? <EmptyState icon={<FileSearch size={24} />} title="No results found"
        message="Try a shorter or different search term, or clear the filters." /> : (
        <ul className="list">{results.map((hit) => (
          <li className="list-item" key={`${hit.kind}-${hit.id}`}>
            <Badge tone="info">{hit.kind}</Badge>
            <div className="list-item__main">
              <p className="list-item__title u-wrap-anywhere"><Link to={hit.to} style={{ color: 'inherit' }}>{hit.title}</Link></p>
              <p className="list-item__meta">{hit.snippet}</p>
            </div>
            <Link to={hit.to} className="btn btn--tertiary btn--sm">Open</Link>
          </li>
        ))}</ul>
      )}
    </div>
  )
}

export function BookmarksPage() {
  const { bookmarks, ready } = useAppData()
  if (!ready) return <Spinner />
  const groups = [
    { kind: 'topic', label: 'Saved topics', icon: Bookmark },
    { kind: 'question', label: 'Saved questions', icon: Bookmark },
    { kind: 'prediction', label: 'Saved predictions', icon: Bookmark },
    { kind: 'material', label: 'Saved material sections', icon: Bookmark },
  ]
  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Personal collection</span>
        <h1 className="t-title">Bookmarks</h1>
        <p className="t-subtitle">Items you saved across both subjects. Bookmarks live in this browser only.</p>
      </div>
      {bookmarks.length === 0 && <EmptyState icon={<Bookmark size={24} />} title="No bookmarks yet"
        message="Use the bookmark action on a topic, question or prediction to save it here." />}
      {groups.map(({ kind, label }) => {
        const items = bookmarks.filter((b) => b.kind === kind)
        if (!items.length) return null
        return (
          <Card key={kind} title={label} subtitle={`${items.length} saved`}>
            <ul className="list">{items.map((b) => {
              const topic = getTopic(b.targetId)
              const prediction = getPrediction(b.targetId)
              const to = topic ? `/subjects/${b.subjectId}/topics/${topic.id}`
                : prediction ? `/subjects/${b.subjectId}/predictions/${prediction.id}`
                : b.kind === 'question' ? `/subjects/${b.subjectId}/questions/${b.targetId}` : '#'
              return (
                <li className="list-item" key={b.key}>
                  <span className="list-item__main">
                    <span className="list-item__title u-wrap-anywhere">{topic?.title ?? prediction?.title ?? b.targetId}</span>
                    <span className="list-item__meta">{getSubject(b.subjectId)?.shortName} · {b.kind}</span>
                  </span>
                  {to !== '#' && <Link to={to} className="btn btn--tertiary btn--sm">Open</Link>}
                  <BookmarkButton subjectId={b.subjectId} kind={b.kind} targetId={b.targetId} label="" />
                </li>
              )
            })}</ul>
          </Card>
        )
      })}
    </div>
  )
}

export function NotesPage() {
  const { notes, ready, refresh, notify } = useAppData()
  const [selected, setSelected] = useState<Note | null>(null)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (selected) setBody(selected.body) }, [selected])

  const save = async () => {
    if (!selected) return
    setSaving(true)
    await saveNote({ ...selected, body, updatedAt: Date.now() })
    await refresh()
    setSaving(false)
    notify('Note saved.', 'success')
  }

  if (!ready) return <Spinner />
  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Personal writing</span>
        <h1 className="t-title">My Notes</h1>
        <p className="t-subtitle">Notes are plain text, stored locally and excluded from academic source content.</p>
      </div>
      <div className="split-layout u-grid" style={{ gridTemplateColumns: '260px minmax(0,1fr)', alignItems: 'start' }}>
        <Card title="All notes">
          {notes.length === 0 ? <EmptyState icon={<NotebookPen size={24} />} title="No notes yet" message="Add a note from a topic or question page." /> :
            <ul className="list">{notes.map((n) => (
              <li className={`list-item list-item--click ${selected?.id === n.id ? 'list-item--inset' : ''}`} key={n.id} onClick={() => setSelected(n)}>
                <span className="list-item__main">
                  <span className="list-item__title u-wrap-anywhere u-clamp-2">{n.body.slice(0, 90) || '(empty note)'}</span>
                  <span className="list-item__meta">{getSubject(n.subjectId)?.shortName} · {new Date(n.updatedAt).toLocaleDateString()}</span>
                </span>
              </li>
            ))}</ul>}
        </Card>
        <Card title={selected ? `Note · ${selected.targetType}` : 'Select a note'}>
          {selected ? (
            <div className="u-col u-gap-3">
              <Field label="Note text" htmlFor="note-body">
                <textarea id="note-body" className="textarea" style={{ minHeight: 320 }} value={body}
                  onChange={(e) => setBody(e.target.value)} />
              </Field>
              <div className="u-between">
                <span className="t-meta">Saved locally in this browser.</span>
                <Button variant="primary" loading={saving} onClick={() => void save()}>Save note</Button>
              </div>
            </div>
          ) : <EmptyState title="Nothing selected" message="Choose a note from the list." />}
        </Card>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  useEffect(() => { void db.history.orderBy('visitedAt').reverse().limit(100).toArray().then(setEntries) }, [])
  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Study history</span>
        <h1 className="t-title">Study History</h1>
        <p className="t-subtitle">Recently opened academic records, stored locally.</p>
      </div>
      {entries.length === 0 ? <EmptyState icon={<Clock3 size={24} />} title="No history yet" message="Opening topics and questions records a visit." /> : (
        <ul className="list">{entries.map((e, i) => (
          <li className="list-item" key={e.id ?? i}>
            <Clock3 size={16} className="u-muted" aria-hidden="true" />
            <span className="list-item__main">
              <span className="list-item__title u-wrap-anywhere">{e.label}</span>
              <span className="list-item__meta">{getSubject(e.subjectId)?.shortName} · {e.targetType} · {new Date(e.visitedAt).toLocaleString()}</span>
            </span>
          </li>
        ))}</ul>
      )}
    </div>
  )
}
