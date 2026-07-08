import { Navigate } from 'react-router-dom'
import { adminRoles } from '../lib/auth'
import { hasSupabaseConfig } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function AdminRoute({ children }) {
  const { loading, user, role } = useAuth()

  if (!hasSupabaseConfig) return children
  if (loading) return <div className="grid min-h-screen place-items-center bg-ink text-white">Cargando admin...</div>
  if (!user) return <Navigate to="/admin/login" replace />
  if (!adminRoles.includes(role)) return <Navigate to="/admin/login" replace />
  return children
}
