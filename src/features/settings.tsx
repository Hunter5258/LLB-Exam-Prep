import { useEffect, useRef, useState } from 'react'
import { Database, Download, HardDrive, Info, Upload } from 'lucide-react'
import { Badge, Button, Card, Dialog, Field } from '@/components/ui/UI'
import { useAppData } from '@/hooks/useAppData'
import { backupSchema, downloadBackup, exportBackup, importBackup, storageEstimate } from '@/services/backup'
import type { ImportResult } from '@/services/backup'

export function SettingsPage() {
  const { settings, updateSettings, notify, refresh } = useAppData()
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [confirmImport, setConfirmImport] = useState<{ text: string; mode: 'merge' | 'replace' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { void storageEstimate().then(setStorage) }, [])

  const pickFile = (mode: 'merge' | 'replace') => {
    const input = fileRef.current
    if (!input) return
    input.dataset.mode = mode
    input.click()
  }

  const onFile = async (file: File, mode: 'merge' | 'replace') => {
    const text = await file.text()
    const check = backupSchema.safeParse(JSON.parse(text))
    if (!check.success) {
      notify('Backup file failed schema validation. Nothing was changed.', 'danger')
      return
    }
    setConfirmImport({ text, mode })
  }

  const doImport = async () => {
    if (!confirmImport) return
    setBusy(true)
    try {
      const r = await importBackup(confirmImport.text, confirmImport.mode)
      setResult(r)
      await refresh()
      notify(`Backup imported: ${r.imported} records ${r.mode === 'replace' ? 'restored' : 'added'}.`, 'success')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Import failed.', 'danger')
    } finally {
      setBusy(false)
      setConfirmImport(null)
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <span className="t-overline">Preferences &amp; local data</span>
        <h1 className="t-title">Settings &amp; Data Backup</h1>
        <p className="t-subtitle">All personal data stays in this browser. The warm ivory reference theme remains the primary design.</p>
      </div>

      <div className="u-grid u-grid--2">
        <Card title="Reading preferences">
          <div className="u-col u-gap-4">
            <Field label="Text size" htmlFor="pref-text">
              <select id="pref-text" className="select" value={settings.textSize}
                onChange={(e) => void updateSettings({ textSize: e.target.value as typeof settings.textSize })}>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="x-large">Extra large</option>
              </select>
            </Field>
            <Field label="Reading measure" htmlFor="pref-measure">
              <select id="pref-measure" className="select" value={settings.measure}
                onChange={(e) => void updateSettings({ measure: e.target.value as typeof settings.measure })}>
                <option value="normal">Comfortable (72ch)</option>
                <option value="wide">Wide (88ch)</option>
              </select>
            </Field>
            <Field label="Review interval (days)" htmlFor="pref-interval" hint="Used by the 'Due for revision' queue. This is a simple date-based interval, not intelligent scheduling.">
              <input id="pref-interval" className="input" type="number" min={1} max={365} value={settings.reviewIntervalDays}
                onChange={(e) => void updateSettings({ reviewIntervalDays: Math.max(1, Math.min(365, Number(e.target.value) || 7)) })} />
            </Field>
            <label className="switch">
              <input type="checkbox" checked={settings.reducedMotion}
                onChange={(e) => void updateSettings({ reducedMotion: e.target.checked })} />
              <span className="switch__track"><span className="switch__thumb" /></span>
              <span>Reduce motion</span>
            </label>
          </div>
        </Card>

        <Card title={<span className="u-row u-gap-2"><Database size={18} /> Storage information</span>}>
          <p className="t-support">Personal records are stored in IndexedDB (Dexie). Academic source content is bundled with the application and is never modified by personal activity.</p>
          {storage ? (
            <div className="u-mt-4 u-col u-gap-2">
              <Badge tone="info">{(storage.usage / 1024 / 1024).toFixed(2)} MB used</Badge>
              <span className="t-meta">Quota: {(storage.quota / 1024 / 1024 / 1024).toFixed(2)} GB (browser-reported)</span>
            </div>
          ) : <p className="t-meta u-mt-4">Storage estimate unavailable in this browser.</p>}
          <p className="legal-note u-mt-4"><Info size={15} style={{ flex: 'none' }} />
            <span><strong>Cross-device limitation:</strong> browser-local data does not follow you between a laptop and a phone. Use export/import to move a backup manually.</span>
          </p>
        </Card>
      </div>

      <Card title={<span className="u-row u-gap-2"><HardDrive size={18} /> Data backup</span>}
        subtitle="Export or restore personal records only — never official syllabus or question content">
        <input ref={fileRef} type="file" accept="application/json,.json" className="u-sr-only" hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            const mode = (e.target.dataset.mode as 'merge' | 'replace') || 'merge'
            if (file) void onFile(file, mode)
            e.target.value = ''
          }} />
        <div className="u-row u-row--wrap">
          <Button variant="primary" icon={<Download size={16} />} onClick={async () => {
            downloadBackup(await exportBackup())
            notify('Backup downloaded.', 'success')
          }}>Export personal data</Button>
          <Button icon={<Upload size={16} />} onClick={() => pickFile('merge')}>Import &amp; merge</Button>
          <Button variant="danger" icon={<Upload size={16} />} onClick={() => pickFile('replace')}>Import &amp; replace all</Button>
        </div>
        <p className="t-support u-mt-4">Import validates the backup schema before changing anything. In merge mode, existing records win on conflict. Replace mode clears existing personal data first.</p>
        {result && <p className="alert alert--success u-mt-4" role="status">
          Imported {result.imported} records; {result.skipped} skipped ({result.mode} mode).
        </p>}
      </Card>

      <Dialog open={Boolean(confirmImport)} onClose={() => setConfirmImport(null)}
        title={confirmImport?.mode === 'replace' ? 'Replace all personal data?' : 'Import and merge backup?'}
        actions={<>
          <Button onClick={() => setConfirmImport(null)}>Cancel</Button>
          <Button variant={confirmImport?.mode === 'replace' ? 'danger' : 'primary'} loading={busy} onClick={() => void doImport()}>
            {confirmImport?.mode === 'replace' ? 'Replace data' : 'Merge backup'}
          </Button>
        </>}>
        <p>This will {confirmImport?.mode === 'replace' ? 'delete your existing personal records before restoring the backup' : 'add records from the backup, keeping existing records on conflict'}. Official academic content is never changed.</p>
      </Dialog>

      <Card title="About this application">
        <p className="t-support">Frontend-first, local-first React application. No server, no external API, no account required. The visual language follows the supplied neumorphic reference; the structure follows the approved architecture; all academic content comes from verified project sources.</p>
      </Card>
    </div>
  )
}
