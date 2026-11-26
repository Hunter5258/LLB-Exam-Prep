import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAppData } from '@/hooks/useAppData'

/* ---------------- Button ---------------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'pressed'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

export function Button({
  variant = 'secondary', size = 'md', loading = false, icon, block = false,
  className = '', children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        'btn', `btn--${variant}`, size !== 'md' ? `btn--${size}` : '',
        block ? 'btn--block' : '', className,
      ].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

/* ---------------- Badge ---------------- */
export function Badge({
  children, tone = 'neutral', year = false,
}: {
  children: ReactNode
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  year?: boolean
}) {
  return <span className={['badge', `badge--${tone}`, year ? 'badge--year' : ''].filter(Boolean).join(' ')}>{children}</span>
}

export function RatingBadge({ value }: { value: string | null }) {
  if (!value) return <Badge tone="neutral">Not rated</Badge>
  const tone = /very high|critical/i.test(value) ? 'success' : /high|moderate/i.test(value) ? 'info' : 'neutral'
  return <Badge tone={tone as 'success' | 'info' | 'neutral'}>{value}</Badge>
}

/* ---------------- Card ---------------- */
export function Card({
  children, className = '', title, subtitle, actions, footer, interactive = false, flat = false, inset = false,
}: {
  children?: ReactNode; className?: string; title?: ReactNode; subtitle?: ReactNode
  actions?: ReactNode; footer?: ReactNode; interactive?: boolean; flat?: boolean; inset?: boolean
}) {
  return (
    <section className={[
      'card', interactive ? 'card--interactive' : '', flat ? 'card--flat' : '',
      inset ? 'card--inset' : '', className,
    ].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <header className="card__header">
          <div>
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="t-support u-mt-2">{subtitle}</p>}
          </div>
          {actions && <div className="u-row u-gap-2">{actions}</div>}
        </header>
      )}
      {children && <div className="u-grow">{children}</div>}
      {footer && <footer className="card__footer">{footer}</footer>}
    </section>
  )
}

/* ---------------- Empty / loading ---------------- */
export function EmptyState({ icon, title, message, action }: {
  icon?: ReactNode; title: string; message?: string; action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">{icon ?? <X size={24} />}</div>
      <div className="empty-state__title">{title}</div>
      {message && <p className="t-support" style={{ maxWidth: '46ch' }}>{message}</p>}
      {action}
    </div>
  )
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <div className="u-grow u-col u-gap-2">
            <div className="skeleton" style={{ width: `${55 + (i % 3) * 12}%` }} />
            <div className="skeleton" style={{ width: '35%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Progress ---------------- */
export function Progress({ value, label, success = false }: {
  value: number; label?: string; success?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={success ? 'progress--success' : ''}>
      {label && <div className="progress__label"><span>{label}</span><span>{clamped}%</span></div>}
      <div className="progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress__bar" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

export function ProgressRing({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="progress-ring" style={{ width: size, height: size }} aria-label={`${clamped}% complete`}>
      <svg width={size} height={size} aria-hidden="true">
        <circle className="progress-ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} />
        <circle className="progress-ring__value" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6}
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped / 100)} />
      </svg>
      <span className="progress-ring__label">{label ?? `${clamped}%`}</span>
    </div>
  )
}

/* ---------------- Dialog ---------------- */
export function Dialog({ open, title, children, actions, onClose }: {
  open: boolean; title: string; children: ReactNode; actions?: ReactNode; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, a, input, textarea, select')?.focus()
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}>
        <h2 className="dialog__title" id="dialog-title">{title}</h2>
        <div className="dialog__body">{children}</div>
        <div className="dialog__actions">{actions}</div>
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useAppData()
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div className={`toast toast--${t.tone}`} key={t.id}>
          <span className="u-grow">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Tabs / breadcrumbs / stepper ---------------- */
export function Tabs({ items, active, onChange }: {
  items: { id: string; label: string }[]; active: string; onChange: (id: string) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={active === item.id}
          className={`tab ${active === item.id ? 'tab--active' : ''}`} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="u-row u-gap-2">
          {i > 0 && <ChevronRight size={13} className="breadcrumbs__sep" aria-hidden="true" />}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper" aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => (
        <div key={label} className={`stepper__item ${i === current ? 'stepper__item--active' : ''} ${i < current ? 'stepper__item--done' : ''}`}>
          <span className="stepper__dot">{i < current ? '✓' : i + 1}</span>
          <span className="stepper__label">{label}</span>
          {i < steps.length - 1 && <span className="stepper__line" aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}

/* ---------------- Disclosure ---------------- */
export function Disclosure({ title, children, defaultOpen = false, meta }: {
  title: ReactNode; children: ReactNode; defaultOpen?: boolean; meta?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="disclosure">
      <button type="button" className="disclosure__trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="u-grow">{title}</span>
        {meta}
        <ChevronDown size={18} className="disclosure__chevron" aria-hidden="true" />
      </button>
      {open && <div className="disclosure__panel" id={id}>{children}</div>}
    </div>
  )
}

/* ---------------- Field ---------------- */
export function Field({ label, hint, error, children, htmlFor }: {
  label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string
}) {
  return (
    <div className="field">
      {htmlFor && <label className="field__label" htmlFor={htmlFor}>{label}</label>}
      {!htmlFor && <span className="field__label">{label}</span>}
      {children}
      {error ? <span className="field__error" role="alert">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  )
}

/* ---------------- Safe Markdown ---------------- */
marked.setOptions({ gfm: true, breaks: false })

export function SafeMarkdown({ source, className = '' }: { source: string; className?: string }) {
  const html = useMemoHtml(source)
  return <div className={`prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

function useMemoHtml(source: string) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    const raw = marked.parse(source, { async: false }) as string
    setHtml(DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } }))
  }, [source])
  return html
}
