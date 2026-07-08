import { motion } from 'framer-motion'
import { ArrowRight, Radio, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import MatchCard from '../components/MatchCard'
import StatCard from '../components/StatCard'
import StandingsTable from '../components/StandingsTable'

export default function Home({ league }) {
  const nextMatches = league.matches.slice(0, 2)
  const settings = league.settings || {}

  return (
    <div className="space-y-8">
      <section className="grid min-h-[520px] items-center gap-6 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(11,140,255,.28),rgba(5,7,12,.9)),url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center p-6 shadow-glow md:grid-cols-[1.1fr_.9fr] md:p-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-gold">
            <Radio size={14} /> En vivo con Realtime
          </p>
          {settings.logo_url && <img src={settings.logo_url} alt={settings.name} className="mb-5 h-20 w-20 rounded-lg object-cover ring-1 ring-white/20" />}
          <h1 className="max-w-3xl text-4xl font-black tracking-normal text-white md:text-7xl">{settings.name || 'Liga Pro Futbol'}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            {settings.description || 'Resultados, tabla, estadísticas, noticias y administración profesional para una liga moderna.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/tabla" className="button">Ver tabla <ArrowRight size={18} /></Link>
            <Link to="/partidos" className="button-secondary">Calendario</Link>
            <Link to="/registro" className="button-secondary">Registrarse</Link>
            <Link to="/login" className="button-secondary">Iniciar sesión</Link>
          </div>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          <StatCard label="Equipos" value={league.teams.length} />
          <StatCard label="Partidos" value={league.matches.length} tone="gold" />
          <StatCard label="Jugadores" value={league.players.length} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="mb-4 flex items-center gap-2 text-lg font-black text-white"><ShieldCheck className="text-electric" /> Tabla general</div>
          <StandingsTable standings={league.standings.slice(0, 5)} />
        </div>
        <div>
          <div className="mb-4 flex items-center gap-2 text-lg font-black text-white"><Sparkles className="text-gold" /> Próximos partidos</div>
          <div className="space-y-4">
            {nextMatches.map((match) => <MatchCard key={match.id} match={match} teamsById={league.teamsById} playersById={league.playersById} />)}
          </div>
        </div>
      </section>
    </div>
  )
}
