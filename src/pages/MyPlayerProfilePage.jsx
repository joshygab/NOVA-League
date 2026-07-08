import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import PageTitle from '../components/PageTitle'
import Badge from '../components/Badge'
import { getCurrentUserProfile } from '../lib/auth'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

export default function MyPlayerProfilePage({ league }) {
  const [state, setState] = useState({ loading: true, user: null })

  useEffect(() => {
    getCurrentUserProfile().then(({ user }) => setState({ loading: false, user }))
  }, [])

  if (!hasSupabaseConfig) return <Navigate to="/login" replace />
  if (state.loading) return <div className="panel p-5">Cargando perfil...</div>
  if (!state.user) return <Navigate to="/login" replace />

  const player = league.allPlayers.find((item) => item.auth_user_id === state.user.id || item.email === state.user.email)
  const team = player ? league.teamsById.get(player.team_id) : null
  const status = player?.approval_status || 'pending'

  return (
    <>
      <PageTitle kicker="Cuenta de jugador" title="Mi perfil">
        <button className="button-secondary" onClick={() => supabase.auth.signOut()}><LogOut size={16} />Salir</button>
      </PageTitle>
      <section className="grid gap-6 lg:grid-cols-[.7fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="grid aspect-[4/3] place-items-center bg-white/5">
            {player?.photo_url ? <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" /> : <UserRound size={64} className="text-slate-500" />}
          </div>
          <div className="p-5">
            <Badge tone={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'gold'}>{statusLabel(status)}</Badge>
            <h2 className="mt-3 text-2xl font-black">{player?.name || state.user.email}</h2>
            <p className="text-sm text-slate-400">{team?.name || player?.requested_team_name || 'Sin equipo asignado'}</p>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="text-xl font-black">Datos personales</h2>
          {!player && <p className="mt-4 text-sm text-gold">Tu cuenta existe, pero todavía no hay perfil de jugador ligado.</p>}
          {player && (
            <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <Info label="Gmail" value={player.email || state.user.email} />
              <Info label="Teléfono" value={player.phone || 'Opcional'} />
              <Info label="Posición" value={player.position || 'Sin definir'} />
              <Info label="Número" value={player.number || '--'} />
              <Info label="Edad" value={player.age || 'Sin definir'} />
              <Info label="Fecha de nacimiento" value={player.birth_date || 'Sin definir'} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function Info({ label, value }) {
  return <div className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>
}

function statusLabel(status) {
  if (status === 'approved') return 'Aprobado'
  if (status === 'rejected') return 'Rechazado'
  return 'Pendiente de aprobación'
}
