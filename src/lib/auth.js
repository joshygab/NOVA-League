import { hasSupabaseConfig, supabase } from './supabase'
import { uploadPublicFile } from './data'

export const roles = {
  player: 'player',
  captain: 'captain',
  admin: 'admin',
  superadmin: 'superadmin',
}

export const adminRoles = [roles.admin, roles.superadmin]

export async function getCurrentUserProfile() {
  if (!hasSupabaseConfig) return { user: null, profile: null, error: null }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.user) return { user: null, profile: null, error: sessionError }

  const user = sessionData.session.user
  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle()
  return { user, profile: data, error }
}

export async function registerPlayer(form) {
  if (!hasSupabaseConfig) {
    return { error: { message: 'Modo demo: conecta Supabase para crear cuentas reales de jugadores.' } }
  }

  if (form.password !== form.confirmPassword) {
    return { error: { message: 'Las contraseñas no coinciden.' } }
  }
  if (form.password.length < 6) {
    return { error: { message: 'La contraseña debe tener al menos 6 caracteres.' } }
  }
  if (!form.team_id) {
    return { error: { message: 'Selecciona el equipo al que pertenece el jugador.' } }
  }

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: {
      data: {
        full_name: form.name,
        role: roles.player,
      },
    },
  })
  if (signUpError) return { error: signUpError }

  const userId = authData.user?.id
  if (!userId) return { error: { message: 'No se pudo crear la cuenta de usuario.' } }
  if (!authData.session) {
    return { error: { message: 'Cuenta creada, pero Supabase está pidiendo confirmar el correo. Desactiva Confirm email en Supabase para que entren sin verificar.' } }
  }

  let photoUrl = null
  if (form.photoFile) {
    photoUrl = await uploadPublicFile('player-photos', `${userId}/${crypto.randomUUID()}-${form.photoFile.name}`, form.photoFile)
  }

  return supabase.from('players').insert({
    auth_user_id: userId,
    division_id: form.division_id || null,
    team_id: form.team_id,
    name: form.name,
    email: form.email,
    phone: form.phone || null,
    birth_date: form.birth_date || null,
    age: form.age ? Number(form.age) : null,
    position: form.position,
    number: form.number ? Number(form.number) : null,
    photo_url: photoUrl,
    approval_status: 'pending',
  }).select().single()
}

export async function signInPlayer(email, password) {
  if (!hasSupabaseConfig) {
    return { error: { message: 'Modo demo: conecta Supabase para iniciar sesión.' } }
  }
  return supabase.auth.signInWithPassword({ email, password })
}
