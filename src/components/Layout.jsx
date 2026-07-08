import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarDays, Goal, Home, Newspaper, Shield, Swords, Trophy, Users } from 'lucide-react'

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/tabla', label: 'Tabla', icon: Trophy },
  { to: '/partidos', label: 'Partidos', icon: CalendarDays },
  { to: '/playoffs', label: 'Playoffs', icon: Swords },
  { to: '/goleadores', label: 'Goleadores', icon: Goal },
  { to: '/equipos', label: 'Equipos', icon: Shield },
  { to: '/jugadores', label: 'Jugadores', icon: Users },
  { to: '/estadisticas', label: 'Stats', icon: BarChart3 },
  { to: '/noticias', label: 'Noticias', icon: Newspaper },
]

export default function Layout({ league }) {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-electric text-xl font-black shadow-glow">LP</span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-white">Liga Pro</p>
              <p className="text-xs text-slate-400">Fútbol competitivo</p>
            </div>
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
          <NavLink to="/admin" className="button-secondary hidden md:inline-flex">Admin</NavLink>
        </div>
      </header>

      {league.error && <div className="mx-auto mt-4 max-w-7xl px-4 text-sm text-gold">{league.error}</div>}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-ink/95 px-2 py-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {nav.slice(0, 5).map((item) => (
            <NavItem key={item.to} {...item} mobile />
          ))}
        </div>
      </nav>
    </div>
  )
}

function NavItem({ to, label, icon: Icon, mobile = false }) {
  return (
    <NavLink
      to={to}
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
