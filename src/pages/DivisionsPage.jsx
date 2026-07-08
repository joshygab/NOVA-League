import { useState } from 'react'
import DivisionStandings from '../components/DivisionStandings'
import PageTitle from '../components/PageTitle'

export default function DivisionsPage({ league }) {
  const [activeId, setActiveId] = useState(league.divisionTables[0]?.id || '')
  const active = league.divisionTables.find((division) => division.id === activeId) || league.divisionTables[0]

  return (
    <>
      <PageTitle kicker="Categorías" title="Divisiones" />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {league.divisionTables.map((division) => (
          <button key={division.id} onClick={() => setActiveId(division.id)} className={active?.id === division.id ? 'button whitespace-nowrap' : 'button-secondary whitespace-nowrap'}>
            {division.name}
          </button>
        ))}
      </div>
      {active ? <DivisionStandings division={active} /> : <section className="panel p-6 text-slate-300">Aún no hay divisiones registradas.</section>}
    </>
  )
}
