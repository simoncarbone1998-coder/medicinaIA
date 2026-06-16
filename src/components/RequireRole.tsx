import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useProfile } from '../lib/useProfile'
import { homePathForProfile } from '../lib/auth'
import type { Role } from '../lib/types'
import { FullScreenLoader } from './ui'

// Guarda de ruta por rol:
//  1. Sin sesión activa -> /login.
//  2. El rol del perfil debe coincidir con el rol requerido; si no, lo mandamos
//     a su propio espacio.
//  3. Para médicos, si su verificación está 'pending' o 'rejected' -> /doctor/pending.
//  4. Si todo cuadra, renderiza la página.
export default function RequireRole({
  role,
  children,
}: {
  role: Role
  children: ReactNode
}) {
  const { session, profile, loading } = useProfile()

  if (loading) return <FullScreenLoader />

  if (!session) return <Navigate to="/login" replace />

  // Rol distinto al requerido: a su espacio correspondiente (evita ver áreas
  // de otros roles).
  if (profile?.role !== role) {
    return <Navigate to={homePathForProfile(profile)} replace />
  }

  // Médico sin aprobar: a la sala de espera, aunque el rol coincida.
  if (
    role === 'doctor' &&
    (profile.doctor_status === 'pending' || profile.doctor_status === 'rejected')
  ) {
    return <Navigate to="/doctor/pending" replace />
  }

  return <>{children}</>
}
