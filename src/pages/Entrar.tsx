import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'

type Mode = 'crear' | 'entrar'

// Longitud mínima de contraseña. Coincide con el mínimo por defecto de Supabase.
const MIN_PASSWORD = 6

// Traduce los errores de Supabase a mensajes claros y amables en español.
function mensajeDeError(code: string | undefined, message: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Este correo ya está registrado. Inicia sesión.'
    case 'weak_password':
      return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
    case 'email_address_invalid':
      return 'Ese correo no es válido.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    default:
      // Respaldo: si no llegó un código conocido, reconocemos por el texto.
      if (/already registered|already been registered/i.test(message)) {
        return 'Este correo ya está registrado. Inicia sesión.'
      }
      if (/at least/i.test(message)) {
        return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
      }
      return 'Algo salió mal. Inténtalo de nuevo.'
  }
}

export default function Entrar() {
  const { session, loading } = useSession()
  const [searchParams] = useSearchParams()

  // El modo inicial viene del enlace (?modo=crear); luego se puede cambiar aquí.
  const [mode, setMode] = useState<Mode>(
    searchParams.get('modo') === 'crear' ? 'crear' : 'entrar',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const isSignup = mode === 'crear'

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-slate-500">Cargando…</p>
      </main>
    )
  }

  // Con sesión activa, no hace falta el formulario: al espacio del paciente.
  // Tras un registro/inicio correcto la sesión se actualiza y esto redirige solo.
  if (session) {
    return <Navigate to="/paciente" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const correo = email.trim()
    if (!correo) {
      setErrorMsg('Escribe tu correo.')
      return
    }
    if (!password) {
      setErrorMsg('Escribe tu contraseña.')
      return
    }
    // Al crear cuenta validamos el largo localmente para evitar un viaje al servidor.
    if (isSignup && password.length < MIN_PASSWORD) {
      setErrorMsg(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
      return
    }

    setSubmitting(true)

    if (isSignup) {
      // TEMPORAL (demo/pruebas): registro con correo + contraseña SIN confirmación
      // por correo. Para que el registro inicie sesión al instante, la opción
      // "Confirm email" debe estar DESACTIVADA en Supabase
      // (Authentication → Providers → Email).
      //
      // ⚠️ SEGURIDAD: volver a ACTIVAR la confirmación de correo antes de pilotos
      // con pacientes reales. Sin ella no se verifica que el correo realmente
      // pertenezca a la persona (datos de salud sensibles). Ver resumen.
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password,
      })
      setSubmitting(false)

      if (error) {
        setErrorMsg(mensajeDeError(error.code, error.message))
        return
      }
      // Si la confirmación por correo sigue activa, signUp NO devuelve sesión.
      // Avisamos en lugar de dejar al usuario sin saber qué pasó.
      if (!data.session) {
        setErrorMsg(
          'No pudimos iniciar tu sesión automáticamente. Revisa tu correo para confirmar tu cuenta.',
        )
        return
      }
      // Con sesión activa, la redirección de arriba lleva a /paciente. Listo.
      return
    }

    // Iniciar sesión con correo + contraseña existentes.
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    })
    setSubmitting(false)
    if (error) {
      setErrorMsg(mensajeDeError(error.code, error.message))
    }
    // Éxito: la sesión se actualiza y la redirección de arriba hace el resto.
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">
          {isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
        </h1>
        <p className="text-pretty text-slate-600">
          {isSignup
            ? 'Crea tu cuenta con tu correo y una contraseña.'
            : 'Entra con tu correo y tu contraseña.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="block font-medium text-slate-800">
            Correo electrónico
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

        <div className="space-y-2">
          <label htmlFor="password" className="block font-medium text-slate-800">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                isSignup ? `Mínimo ${MIN_PASSWORD} caracteres` : 'Tu contraseña'
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-24 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-sm font-medium text-teal-700"
              aria-label={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <p role="alert" className="text-sm text-rose-700">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {submitting
            ? 'Un momento…'
            : isSignup
              ? 'Crear cuenta'
              : 'Iniciar sesión'}
        </button>

        {isSignup && (
          // Aviso de tratamiento de datos (Ley 1581 / Habeas Data).
          <p className="text-xs leading-relaxed text-slate-500">
            Al crear tu cuenta, aceptas el tratamiento de tus datos de salud
            según nuestra{' '}
            <a href="#" className="underline">
              política de privacidad
            </a>
            .
          </p>
        )}
      </form>

      {/* Cambiar entre crear cuenta e iniciar sesión sin salir de la página. */}
      <p className="text-center text-sm text-slate-600">
        {isSignup ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? 'entrar' : 'crear')
            setErrorMsg('')
          }}
          className="font-semibold text-teal-700 underline"
        >
          {isSignup ? 'Inicia sesión' : 'Crea una'}
        </button>
      </p>

      <Link
        to="/"
        className="self-center text-sm font-medium text-slate-500 underline"
      >
        ← Volver al inicio
      </Link>
    </main>
  )
}
