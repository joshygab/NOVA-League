import PageTitle from '../components/PageTitle'
import PlayoffBracket from '../components/PlayoffBracket'

export default function PlayoffsPage({ league }) {
  return (
    <>
      <PageTitle kicker="Fase final" title="Playoffs" />
      {league.playoffMatches.length ? (
        <PlayoffBracket matches={league.playoffMatches} teamsById={league.teamsById} />
      ) : (
        <section className="panel p-6 text-slate-300">Los cruces de semifinales aparecerán cuando el administrador genere playoffs.</section>
      )}
    </>
  )
}
