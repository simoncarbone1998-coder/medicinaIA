import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'

export default function Dashboard() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-slate-500">Cargando…</p>
      </main>
    )
  }

  // Página protegida: sin sesión activa, de vuelta al inicio.
  if (!session) {
    return <Navigate to="/" replace />
  }

  // Preferimos el nombre real; si no hay, caemos al email.
  const meta = session.user.user_metadata
  const displayName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    (meta.user_name as string | undefined) ??
    session.user.email ??
    'usuario'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Bienvenido/a, {displayName}
        </h1>
        <p className="text-slate-600">Has iniciado sesión correctamente.</p>
      </header>

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Cerrar sesión
      </button>
    </main>
  )
}
