import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { signInPlayer } from '../lib/auth'
import { hasSupabaseConfig } from '../lib/supabase'

export default function PlayerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await signInPlayer(email, password)
    setBusy(false)
    if (error) {
      setMessage(error.message)
      return
    }
    navigate('/mi-perfil')
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
      <form onSubmit={handleSubmit} className="panel w-full p-6">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-lg bg-electric shadow-glow">
          <LogIn />
        </div>
        <h1 className="text-3xl font-black">Login de jugadores</h1>
        <p className="mt-2 text-sm text-slate-400">Entra con tu Gmail y contraseña para ver tu perfil.</p>
        <label className="mt-6 block text-sm font-bold">Gmail</label>
        <input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className="mt-4 block text-sm font-bold">Contraseña</label>
        <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {!hasSupabaseConfig && <p className="mt-4 text-sm text-gold">Modo demo: conecta Supabase para iniciar sesión real.</p>}
        {message && <p className="mt-4 text-sm text-gold">{message}</p>}
        <button className="button mt-6 w-full" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button>
        <Link to="/registro" className="button-secondary mt-3 w-full">Crear cuenta de jugador</Link>
      </form>
    </main>
  )
}
