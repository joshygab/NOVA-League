import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarDays, Goal, History, Home, LogIn, Menu, Shield, Swords, Trophy, UserPlus, Users, X } from 'lucide-react'

const nav = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/divisiones', label: 'Divisiones', icon: Trophy },
  { to: '/tabla', label: 'Tabla', icon: Trophy },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/partidos', label: 'Partidos', icon: Swords },
  { to: '/playoffs', label: 'Playoffs', icon: Swords },
  { to: '/goleadores', label: 'Goleadores', icon: Goal },
  { to: '/equipos', label: 'Equipos', icon: Shield },
  { to: '/jugadores', label: 'Jugadores', icon: Users },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/registro', label: 'Registro', icon: UserPlus },
  { to: '/login', label: 'Login', icon: LogIn },
]

export default function Layout({ league }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const settings = league.settings || {}
  const shortName = settings.short_name || 'LP'
  const leagueName = settings.name || 'Liga Pro'
  const tagline = settings.tagline || 'Fútbol competitivo'

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={leagueName} className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-electric text-xl font-black shadow-glow">{shortName}</span>
            )}
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-white">{leagueName}</p>
              <p className="text-xs text-slate-400">{tagline}</p>
            </div>
          </NavLink>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.slice(0, 9).map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <button className="button-secondary lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu size={18} /></button>
          <NavLink to="/registro" className="button-secondary hidden lg:inline-flex">Registro</NavLink>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/75 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />
          <aside className="absolute right-0 top-0 h-full w-[min(88vw,360px)] border-l border-white/10 bg-panel p-4 shadow-glow">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-gold">Índice</p>
              <button className="button-secondary px-3" onClick={() => setMenuOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <nav className="grid gap-2">
              {nav.map((item) => <NavItem key={item.to} {...item} onClick={() => setMenuOpen(false)} />)}
            </nav>
          </aside>
        </div>
      )}

      {league.error && <div className="mx-auto mt-4 max-w-7xl px-4 text-sm text-gold">{league.error}</div>}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-ink/95 px-2 py-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {nav.slice(0, 5).map((item) => (
            <NavItem key={item.to} {...item} mobile />
          ))}
        </div>
      </nav>
    </div>
  )
}

function NavItem({ to, label, icon: Icon, mobile = false, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
          isActive ? 'bg-electric text-white shadow-glow' : 'text-slate-300 hover:bg-white/5 hover:text-white',
          mobile ? 'flex-col justify-center gap-1 px-1 text-[11px]' : '',
        ].join(' ')
      }
    >
      <Icon size={mobile ? 18 : 16} />
      {label}
    </NavLink>
  )
}
