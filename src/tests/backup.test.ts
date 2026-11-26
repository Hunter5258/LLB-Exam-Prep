import { describe, expect, it } from 'vitest'
import { backupSchema } from '@/services/backup'

const valid = {
  format: 'llb-study-platform-backup',
  schemaVersion: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  data: { revisions: [], bookmarks: [], notes: [], drafts: [], history: [], recall: [], settings: [] },
}

describe('backup validation', () => {
  it('accepts a well-formed backup', () => {
    expect(backupSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a wrong format marker', () => {
    expect(backupSchema.safeParse({ ...valid, format: 'other' }).success).toBe(false)
  })

  it('rejects a malformed personal record', () => {
    expect(backupSchema.safeParse({
      ...valid,
      data: { ...valid.data, revisions: [{ key: 'x' }] },
    }).success).toBe(false)
  })
})
