import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from './supabase'

const AuthContext = createContext(null)

const emptyAuth = {
  loading: false,
  user: null,
  profile: null,
  player: null,
  role: 'viewer',
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ ...emptyAuth, loading: true })

  useEffect(() => {
    let active = true

    async function loadAuth(session) {
      if (!hasSupabaseConfig) {
        if (active) setAuth(emptyAuth)
        return
      }

      const user = session?.user || null
      if (!user) {
        if (active) setAuth(emptyAuth)
        return
      }

      const [profileResult, playerResult] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('players').select('*').eq('auth_user_id', user.id).maybeSingle(),
      ])

      if (!active) return
      const profile = profileResult.data || null
      setAuth({
        loading: false,
        user,
        profile,
        player: playerResult.data || null,
        role: profile?.role || 'viewer',
      })
    }

    if (!hasSupabaseConfig) {
      setAuth(emptyAuth)
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => loadAuth(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth((current) => ({ ...current, loading: true }))
      loadAuth(session)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    if (hasSupabaseConfig) await supabase.auth.signOut()
    setAuth(emptyAuth)
  }

  const value = useMemo(() => ({ ...auth, signOut }), [auth])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
