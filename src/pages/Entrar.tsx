import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function Entrar() {
  const { session, loading } = useSession()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // "crear" muestra textos de registro; cualquier otro valor, de inicio de sesión.
  // Con enlace mágico la operación es la misma: registra o entra según exista o no.
  const isSignup = searchParams.get('modo') === 'crear'

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-slate-500">Cargando…</p>
      </main>
    )
  }

  // Si ya hay sesión, no tiene sentido pedir el correo: al espacio del paciente.
  if (session) {
    return <Navigate to="/paciente" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Tras tocar el enlace del correo, el usuario vuelve a su espacio.
        emailRedirectTo: `${window.location.origin}/paciente`,
        // Crea la cuenta si el correo aún no existe (sirve para registro e inicio).
        shouldCreateUser: true,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg('No pudimos enviar el enlace. Revisa tu correo e inténtalo otra vez.')
      return
    }

    setStatus('sent')
  }

  // Pantalla de confirmación tras enviar el enlace.
  if (status === 'sent') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
        <div className="space-y-3 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4 7 8 5 8-5" />
              <rect x="3" y="5" width="18" height="14" rx="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Revisa tu correo</h1>
          <p className="text-pretty text-slate-600">
            Te enviamos un enlace a <strong className="text-slate-900">{email}</strong>.
            Ábrelo en este teléfono para entrar.
          </p>
          <p className="text-sm text-slate-500">
            ¿No lo ves? Espera un momento y revisa la carpeta de spam o correo no
            deseado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatus('idle')
            setEmail('')
          }}
          className="self-center text-sm font-medium text-teal-700 underline"
        >
          Usar otro correo
        </button>
      </main>
    )
  }

  // Formulario de correo (estado inicial / error / enviando).
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">
          {isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
        </h1>
        <p className="text-pretty text-slate-600">
          Escribe tu correo y te enviaremos un enlace para entrar. No necesitas
          contraseña.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="block font-medium text-slate-800">
            Tu correo electrónico
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>

        {status === 'error' && (
          <p role="alert" className="text-sm text-rose-700">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar enlace'}
        </button>

        {/* Aviso de tratamiento de datos (Ley 1581 / Habeas Data). */}
        <p className="text-xs leading-relaxed text-slate-500">
          Al continuar, aceptas el tratamiento de tus datos de salud según
          nuestra{' '}
          <a href="#" className="underline">
            política de privacidad
          </a>
          .
        </p>
      </form>

      <Link to="/" className="self-center text-sm font-medium text-slate-500 underline">
        ← Volver al inicio
      </Link>
    </main>
  )
}
