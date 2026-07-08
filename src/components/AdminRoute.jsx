import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { adminRoles } from '../lib/auth'

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setStatus('demo')
      return
    }
    async function verify(session) {
      if (!session?.user) {
        setStatus('guest')
        return
      }
      const { data } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).maybeSingle()
      setStatus(adminRoles.includes(data?.role) ? 'authed' : 'forbidden')
    }
    supabase.auth.getSession().then(({ data }) => verify(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => verify(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (status === 'loading') return <div className="grid min-h-screen place-items-center bg-ink text-white">Cargando admin...</div>
  if (status === 'guest') return <Navigate to="/admin/login" replace />
  if (status === 'forbidden') return <Navigate to="/" replace />
  return children
}
