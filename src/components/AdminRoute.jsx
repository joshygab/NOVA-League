import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setStatus('demo')
      return
    }
    supabase.auth.getSession().then(({ data }) => setStatus(data.session ? 'authed' : 'guest'))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setStatus(session ? 'authed' : 'guest'))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (status === 'loading') return <div className="grid min-h-screen place-items-center bg-ink text-white">Cargando admin...</div>
  if (status === 'guest') return <Navigate to="/admin/login" replace />
  return children
}
