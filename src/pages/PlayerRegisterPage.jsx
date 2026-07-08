import { useMemo, useState } from 'react'
import { Camera, UserPlus } from 'lucide-react'
import PageTitle from '../components/PageTitle'
import { registerPlayer } from '../lib/auth'

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  birth_date: '',
  age: '',
  phone: '',
  team_id: '',
  requested_team_name: '',
  position: '',
  number: '',
  photoFile: null,
}

export default function PlayerRegisterPage({ league }) {
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const teamOptions = useMemo(() => league.teams.map((team) => ({ id: team.id, name: team.name })), [league.teams])

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await registerPlayer(form)
    setBusy(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setForm(initialForm)
    setMessage('Registro enviado. Tu perfil queda pendiente hasta que NOVA Admin lo apruebe.')
    league.reload()
  }

  return (
    <>
      <PageTitle kicker="Jugadores" title="Registro de jugador" />
      <section className="grid gap-6 lg:grid-cols-[1fr_.7fr]">
        <form onSubmit={handleSubmit} className="panel space-y-4 p-5">
          <Field label="Nombre completo" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <Field label="Gmail" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contraseña" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} required />
            <Field label="Confirmar contraseña" type="password" value={form.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={(birth_date) => setForm({ ...form, birth_date })} />
            <Field label="Edad" type="number" value={form.age} onChange={(age) => setForm({ ...form, age })} />
          </div>
          <Field label="Teléfono opcional" type="tel" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          <Select label="Equipo al que pertenece" value={form.team_id} onChange={(team_id) => setForm({ ...form, team_id, requested_team_name: '' })} options={teamOptions} />
          {!form.team_id && <Field label="Solicitud para unirse a equipo" value={form.requested_team_name} onChange={(requested_team_name) => setForm({ ...form, requested_team_name })} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Posición" value={form.position} onChange={(position) => setForm({ ...form, position })} required />
            <Field label="Número de camiseta" type="number" value={form.number} onChange={(number) => setForm({ ...form, number })} />
          </div>
          <label className="block text-sm font-bold">
            Foto opcional
            <span className="input mt-2 flex cursor-pointer items-center gap-2">
              <Camera size={16} /> {form.photoFile?.name || 'Seleccionar foto'}
              <input className="sr-only" type="file" accept="image/*" onChange={(event) => setForm({ ...form, photoFile: event.target.files?.[0] || null })} />
            </span>
          </label>
          {message && <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">{message}</p>}
          <button className="button w-full" disabled={busy}><UserPlus size={16} />{busy ? 'Enviando...' : 'Crear cuenta y solicitar aprobación'}</button>
        </form>

        <aside className="panel p-5">
          <h2 className="text-xl font-black">Tu acceso</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <p>Al registrarte se crea tu cuenta de usuario y tu perfil de jugador.</p>
            <p>Tu estado inicial es pendiente. Un administrador debe aprobarte antes de aparecer en las plantillas públicas.</p>
            <p>Los jugadores pueden ver información pública y su perfil, pero no pueden editar resultados ni estadísticas.</p>
          </div>
        </aside>
      </section>
    </>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return <label className="block text-sm font-bold">{label}<input className="input mt-2" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>
}

function Select({ label, value, onChange, options }) {
  return <label className="block text-sm font-bold">{label}<select className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Solicitar equipo / sin equipo</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
}
