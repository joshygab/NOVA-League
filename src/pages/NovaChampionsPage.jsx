import { motion } from 'framer-motion'
import { Crown, Shield, Sparkles, Trophy } from 'lucide-react'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import NovaChampionsBracket from '../components/NovaChampionsBracket'
import PageTitle from '../components/PageTitle'

export default function NovaChampionsPage({ league }) {
  const cup = league.novaChampions || {}
  const settings = cup.settings || {}
  const active = settings.is_active || settings.status === 'active'
  const qualified = (cup.qualifiedTeams || []).map((row) => league.teamsById.get(row.team_id)).filter(Boolean)

  if (!active) return <ComingSoon />

  return (
    <div className="space-y-8">
      <PageTitle kicker="Torneo internacional" title="NOVA Champions Cup" />
      <section className="rounded-lg border border-gold/30 bg-black p-6 shadow-gold">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge tone="gold">Activa</Badge>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-normal">NOVA Champions Cup</h1>
            <p className="mt-2 text-slate-300">Los mejores equipos de cada división competirán por la gloria.</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold"><Trophy size={42} /></div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black">Equipos clasificados</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {qualified.map((team) => (
            <article key={team.id} className="rounded-lg border border-gold/20 bg-black/80 p-4">
              <Crest src={team.crest_url} name={team.name} size="lg" />
              <h3 className="mt-3 text-lg font-black">{team.name}</h3>
              <p className="text-sm text-slate-400">{league.divisionsById.get(team.division_id)?.name}</p>
            </article>
          ))}
        </div>
      </section>

      <NovaChampionsBracket matches={cup.matches || []} teamsById={league.teamsById} />
    </div>
  )
}

function ComingSoon() {
  return (
    <section className="relative min-h-[76vh] overflow-hidden rounded-lg border border-gold/30 bg-black px-6 py-16 text-center shadow-gold">
      <motion.div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full border border-gold/20" animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.5, 0.25] }} transition={{ duration: 4, repeat: Infinity }} />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-3xl">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-lg border border-gold/50 bg-gold/10 text-gold shadow-gold">
          <Crown size={54} />
        </div>
        <p className="mt-8 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-gold">
          <Sparkles size={14} /> Próximamente
        </p>
        <h1 className="mt-6 text-5xl font-black uppercase tracking-normal text-white md:text-7xl">NOVA Champions Cup</h1>
        <p className="mt-5 text-xl font-semibold text-gold">La copa más importante de NOVA League está por comenzar</p>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">Los mejores equipos de cada división competirán por la gloria.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Feature icon={Shield} label="Clasificados elite" />
          <Feature icon={Trophy} label="Bracket premium" />
          <Feature icon={Crown} label="Campeón histórico" />
        </div>
      </motion.div>
    </section>
  )
}

function Feature({ icon: Icon, label }) {
  return <div className="rounded-lg border border-gold/20 bg-white/[0.03] p-4 text-gold"><Icon className="mx-auto" /><p className="mt-2 text-sm font-black uppercase tracking-[0.14em]">{label}</p></div>
}
