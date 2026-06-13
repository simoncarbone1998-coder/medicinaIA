import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'

export default function Paciente() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-slate-500">Cargando…</p>
      </main>
    )
  }

  // Página protegida: sin sesión activa, de vuelta al inicio de sesión.
  if (!session) {
    return <Navigate to="/entrar" replace />
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Bienvenido</h1>
        <p className="text-slate-600">
          Has iniciado sesión correctamente.
        </p>
        <p className="text-sm text-slate-500">{session.user.email}</p>
      </header>

      <p className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
        Pronto podrás iniciar tu consulta aquí.
      </p>

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="self-start rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        Cerrar sesión
      </button>
    </main>
  )
}
