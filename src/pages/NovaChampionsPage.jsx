import { Trophy } from 'lucide-react'
import Badge from '../components/Badge'
import Crest from '../components/Crest'
import NovaChampionsBracket from '../components/NovaChampionsBracket'
import PageTitle from '../components/PageTitle'
import PremiumComingSoon from '../components/PremiumComingSoon'

export default function NovaChampionsPage({ league }) {
  const cup = league.novaChampions || {}
  const settings = cup.settings || {}
  const active = settings.is_active || settings.status === 'active'
  const qualified = (cup.qualifiedTeams || []).map((row) => league.teamsById.get(row.team_id)).filter(Boolean)

  if (!active) return (
    <PremiumComingSoon
      title="NOVA Champions Cup"
      subtitle="La copa más importante de NOVA League está por comenzar"
      body="Los mejores equipos de cada división competirán por la gloria."
      features={['Clasificados elite', 'Bracket premium', 'Campeón histórico']}
    />
  )

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
