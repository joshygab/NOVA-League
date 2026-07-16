import { Navigate } from 'react-router-dom'
import { hasSupabaseConfig } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { hasPermission, permissions } from '../lib/permissions'

export default function AdminRoute({ children }) {
  const { loading, user, role } = useAuth()

  if (!hasSupabaseConfig) return children
  if (loading) return <div className="grid min-h-screen place-items-center bg-ink text-white">Cargando admin...</div>
  if (!user) return <Navigate to="/admin/login" replace />
  if (!hasPermission(role, permissions.ADMIN_ACCESS)) return <Navigate to="/admin/login" replace />
  return children
}
