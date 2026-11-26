import { describe, expect, it } from 'vitest'
import { content, papers, predictions, questions, subjects, topics, units } from '@/content'
import { search } from '@/services/search'

describe('academic content integrity', () => {
  it('has exactly the two prescribed subjects', () => {
    expect(subjects.map((s) => s.id)).toEqual(['crpc', 'labour-law-1'])
  })

  it('has unique stable IDs across all entities', () => {
    const all = [
      ...subjects, ...units, ...topics, ...papers, ...questions,
      ...predictions, ...content.reports,
    ].map((x) => x.id)
    expect(new Set(all).size).toBe(all.length)
  })

  it('keeps every question linked to a real paper and valid topics', () => {
    const paperIds = new Set(papers.map((p) => p.id))
    const topicIds = new Set(topics.map((t) => t.id))
    for (const q of questions) {
      expect(paperIds.has(q.paperId)).toBe(true)
      for (const t of q.topicIds) expect(topicIds.has(t)).toBe(true)
      expect(['verified', 'reviewed', 'provisional', 'unmapped']).toContain(q.mappingStatus)
    }
  })

  it('preserves real report years and the missing-year records', () => {
    expect(content.reports.find((r) => r.subjectId === 'crpc')?.year).toBe(2025)
    expect(content.reports.find((r) => r.subjectId === 'labour-law-1')?.year).toBe(2026)
    expect(papers.some((p) => p.subjectId === 'crpc' && p.year === 2023)).toBe(false)
    expect(papers.some((p) => p.subjectId === 'labour-law-1' && p.year === 2022)).toBe(false)
    expect(papers.find((p) => p.id === 'CRPC-QP-2022')?.note).toContain('2022')
  })

  it('searches locally across question wording', () => {
    const hits = search('anticipatory bail', { subjectId: 'crpc', kind: 'question', year: '' })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.subjectId === 'crpc' && h.kind === 'question')).toBe(true)
  })
})
