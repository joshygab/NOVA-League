import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { hasSupabaseConfig, supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (!hasSupabaseConfig) return <Navigate to="/admin" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    navigate('/admin')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4">
      <form onSubmit={handleSubmit} className="panel w-full max-w-md p-6">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-lg bg-electric shadow-glow">
          <Lock />
        </div>
        <h1 className="text-3xl font-black">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-400">Acceso privado para administrar la liga.</p>
        <label className="mt-6 block text-sm font-bold">Email</label>
        <input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className="mt-4 block text-sm font-bold">Contraseña</label>
        <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="mt-4 text-sm text-gold">{error}</p>}
        <button className="button mt-6 w-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </main>
  )
}
