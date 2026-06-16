import { useNavigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Wordmark } from './ui'

// Estructura común de las páginas internas: barra superior con el logotipo, una
// etiqueta opcional de rol y el botón de cerrar sesión.
export default function DashboardLayout({
  badge,
  children,
}: {
  badge?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Wordmark className="text-xl text-brand-800" />
            {badge && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-full border border-sand-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-sand-100 disabled:opacity-60"
          >
            {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-8">{children}</main>
    </div>
  )
}
