import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../lib/useProfile'
import { Wordmark, FullScreenLoader } from '../components/ui'

// Fila de resumen de un dato enviado en el registro.
function SummaryRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 border-b border-sand-200 py-2.5 last:border-0">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-stone-900">{value}</dd>
    </div>
  )
}

export default function DoctorPending() {
  const navigate = useNavigate()
  const { session, profile, loading } = useProfile()
  const [signingOut, setSigningOut] = useState(false)

  if (loading) return <FullScreenLoader />

  // Sin sesión: a iniciar sesión.
  if (!session) return <Navigate to="/login" replace />

  // Médico ya aprobado: directo a su agenda.
  if (profile?.role === 'doctor' && profile.doctor_status === 'approved') {
    return <Navigate to="/doctor/agenda" replace />
  }

  // Un no-médico no debería estar aquí: a su propio espacio.
  if (profile && profile.role !== 'doctor') {
    return <Navigate to="/" replace />
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const rejected = profile?.doctor_status === 'rejected'

  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="mx-auto flex max-w-md items-center px-5 py-5">
        <Wordmark className="text-2xl text-brand-800" />
      </header>
      <main className="mx-auto w-full max-w-md px-5 pb-16 pt-2">
        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-clay-500" aria-hidden="true" />
            {rejected ? 'Solicitud no aprobada' : 'En revisión'}
          </span>

          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-stone-900">
            {rejected
              ? 'No pudimos aprobar tu cuenta'
              : 'Tu cuenta está siendo revisada'}
          </h1>

          <p className="mt-3 text-pretty leading-relaxed text-stone-600">
            {rejected
              ? 'Revisamos tu solicitud y por ahora no pudimos aprobarla. Si crees que es un error, escríbenos y lo revisamos contigo.'
              : 'Nuestro equipo está verificando tus credenciales médicas. Te avisaremos por correo en cuanto tu cuenta esté aprobada y puedas empezar a atender pacientes.'}
          </p>

          {profile && (
            <dl className="mt-6 rounded-2xl bg-sand-50 px-4 py-1">
              <SummaryRow label="Nombre" value={profile.full_name} />
              <SummaryRow label="Correo" value={profile.email} />
              <SummaryRow label="Teléfono" value={profile.phone} />
              <SummaryRow label="Especialidad" value={profile.specialty} />
              <SummaryRow
                label="Universidad"
                value={profile.undergraduate_university}
              />
              <SummaryRow
                label="Tarjeta profesional"
                value={profile.medical_license}
              />
            </dl>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-6 w-full rounded-full border border-sand-300 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-sand-100 disabled:opacity-60"
          >
            {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </main>
    </div>
  )
}
