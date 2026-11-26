import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen, Bookmark, CalendarClock, GraduationCap, Home, Layers3,
  Menu, NotebookPen, Search, Settings2, Sparkles, X,
} from 'lucide-react'
import { subjects } from '@/content'
import { useAppData } from '@/hooks/useAppData'

const globalNav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/subjects', label: 'My Subjects', icon: Layers3 },
  { to: '/revision', label: 'Revision Centre', icon: CalendarClock },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/notes', label: 'My Notes', icon: NotebookPen },
  { to: '/history', label: 'Study History', icon: BookOpen },
]

const bottomNav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/subjects', label: 'Subjects', icon: Layers3 },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/revision', label: 'Revision', icon: CalendarClock },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { bookmarks } = useAppData()
  const location = useLocation()
  const activeSubject = location.pathname.match(/^\/subjects\/([^/]+)/)?.[1]
  return (
    <>
      <div className="nav-group">
        <div className="nav-group__label">Workspace</div>
        <ul className="nav-list">
          {globalNav.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} onClick={onNavigate}
                className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
                <Icon size={18} className="nav-item__icon" aria-hidden="true" />
                <span className="nav-item__text">{label}</span>
                {label === 'Bookmarks' && bookmarks.length > 0 && <span className="nav-item__count">{bookmarks.length}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="nav-group">
        <div className="nav-group__label">Subjects</div>
        <ul className="nav-list">
          {subjects.map((s) => (
            <li key={s.id}>
              <NavLink to={`/subjects/${s.id}`} onClick={onNavigate}
                className={() => `nav-item ${activeSubject === s.id ? 'nav-item--active' : ''}`}>
                <GraduationCap size={18} className="nav-item__icon" aria-hidden="true" />
                <span className="nav-item__text">{s.shortName}</span>
                <span className="nav-item__count">{s.paperCode}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="nav-group">
        <div className="nav-group__label">System</div>
        <ul className="nav-list">
          <li>
            <NavLink to="/settings" onClick={onNavigate}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
              <Settings2 size={18} className="nav-item__icon" aria-hidden="true" />
              <span className="nav-item__text">Settings &amp; Backup</span>
            </NavLink>
          </li>
        </ul>
      </div>
    </>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const subjectArea = location.pathname.startsWith('/subjects/')

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <Link to="/" className="app-brand" aria-label="LL.B. Study and Revision — home">
        <span className="app-brand__mark"><GraduationCap size={20} aria-hidden="true" /></span>
        <span className="app-brand__text">
          <span className="app-brand__title">LL.B. Study</span>
          <span className="app-brand__sub">Syllabus · Questions · Revision</span>
        </span>
      </Link>

      <header className="app-topbar">
        <button type="button" className="btn btn--tertiary btn--icon" aria-label="Open navigation"
          aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <form className="app-topbar__search search" role="search" onSubmit={submitSearch}>
          <Search size={17} aria-hidden="true" />
          <label className="u-sr-only" htmlFor="global-search">Search the study platform</label>
          <input id="global-search" className="input" placeholder="Search topics, questions, predictions…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
        <div className="app-topbar__spacer" />
        {subjectArea && <span className="t-meta u-truncate" style={{ maxWidth: 210 }}>
          <Sparkles size={13} aria-hidden="true" /> Evidence-based study
        </span>}
        <Link to="/settings" className="avatar" aria-label="Settings">GU</Link>
      </header>

      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <aside className={`app-sidebar ${menuOpen ? 'app-sidebar--open' : ''}`} aria-label="Main navigation">
        <SidebarContent onNavigate={() => setMenuOpen(false)} />
      </aside>

      <main className="app-main" id="main-content">{children}</main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {bottomNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'mobile-nav-item--active' : ''}`}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
