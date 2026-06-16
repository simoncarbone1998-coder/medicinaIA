import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

// Longitud mínima de contraseña (coincide con el mínimo por defecto de Supabase).
export const MIN_PASSWORD = 6

// ¿A dónde mandamos a este usuario según su rol y estado?
//  - paciente            -> Mi Salud
//  - médico aprobado     -> Agenda
//  - médico no aprobado  -> página de espera
//  - admin               -> panel
//  - sin perfil/rol      -> inicio de sesión
export function homePathForProfile(profile: Profile | null): string {
  if (!profile?.role) return '/login'
  if (profile.role === 'patient') return '/paciente/mi-salud'
  if (profile.role === 'admin') return '/admin/dashboard'
  // médico
  return profile.doctor_status === 'approved' ? '/doctor/agenda' : '/doctor/pending'
}

// Traduce errores de Supabase Auth a mensajes claros en español.
export function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos'
    case 'user_already_exists':
    case 'email_exists':
      return 'Este correo ya está registrado. ¿Ya tienes cuenta?'
    case 'weak_password':
      return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
    case 'email_address_invalid':
      return 'Ese correo no es válido.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    default:
      if (/already registered|already been registered/i.test(error.message)) {
        return 'Este correo ya está registrado. ¿Ya tienes cuenta?'
      }
      return 'Algo salió mal. Inténtalo de nuevo.'
  }
}

// Validación básica de correo (suficiente para el cliente; el servidor revalida).
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Campos del perfil que la app rellena justo después del registro.
type ProfileFields = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'role'
    | 'phone'
    | 'city'
    | 'delivery_address'
    | 'specialty'
    | 'medical_license'
    | 'undergraduate_university'
    | 'doctor_status'
  >
>

// Crea la cuenta (sin confirmación por correo: queda activa al instante) y
// completa el perfil con los datos del formulario. El trigger handle_new_user ya
// creó la fila del perfil con id + email; aquí solo la actualizamos.
export async function signUpWithProfile(
  email: string,
  password: string,
  profileFields: ProfileFields,
): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: mapAuthError(error) }
  if (!data.user) return { error: 'No se pudo crear la cuenta. Inténtalo de nuevo.' }

  // Si la confirmación por correo siguiera activa, signUp no devuelve sesión.
  // En esta etapa debe estar desactivada (cuenta activa al instante).
  if (!data.session) {
    return {
      error:
        'No pudimos iniciar tu sesión automáticamente. Revisa tu correo para confirmar tu cuenta.',
    }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(profileFields)
    .eq('id', data.user.id)

  if (updateError) {
    return {
      error: 'Creamos tu cuenta pero no pudimos guardar tus datos. Inténtalo de nuevo.',
    }
  }

  return {}
}
