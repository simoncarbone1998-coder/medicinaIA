import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  )
}

export default function Landing() {
  const { session, loading } = useSession()

  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      // Tras autenticar, GitHub devuelve al usuario a la raíz; esta misma
      // página detecta la sesión y lo redirige a /dashboard.
      options: { redirectTo: window.location.origin },
    })
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-slate-500">Cargando…</p>
      </main>
    )
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">medicinaIA</h1>
        <p className="text-pretty text-slate-600">
          Atención médica primaria con IA, revisada y certificada por un médico
          real. Cuenta tus síntomas por chat y recibe orientación segura.
        </p>
      </header>

      <button
        type="button"
        onClick={signInWithGitHub}
        className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        <GitHubIcon />
        Iniciar sesión con GitHub
      </button>
    </main>
  )
}
