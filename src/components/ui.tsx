import { Link } from 'react-router-dom'
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

// Logotipo de Contigo. Reutilizado en las páginas de la app (la landing tiene
// su propia copia para no arriesgar su diseño).
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`font-display font-semibold tracking-tight ${className}`}
    >
      Contigo<span className="text-clay-500">.</span>
    </Link>
  )
}

// Pantalla de carga a pantalla completa, mientras se resuelve sesión/perfil.
export function FullScreenLoader() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sand-50 px-5">
      <p className="text-stone-500">Cargando…</p>
    </main>
  )
}

// Contenedor centrado y angosto para formularios de autenticación (mobile-first).
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="mx-auto flex max-w-md items-center px-5 py-5">
        <Wordmark className="text-2xl text-brand-800" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col px-5 pb-16 pt-2">
        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-pretty leading-relaxed text-stone-600">
              {subtitle}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="mt-6 text-center text-sm text-stone-600">{footer}</div>
        )}
      </main>
    </div>
  )
}

const fieldClasses =
  'w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25'

// Campo de texto con etiqueta. forwardRef por si luego enfocamos el primer error.
export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string }
>(function Field({ label, id, ...props }, ref) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      <input ref={ref} id={id} className={fieldClasses} {...props} />
    </div>
  )
})

// Campo de selección (dropdown) con etiqueta.
export function SelectField({
  label,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      <select id={id} className={fieldClasses} {...props}>
        {children}
      </select>
    </div>
  )
}

// Botón primario de ancho completo, con estado de carga.
export function SubmitButton({
  loading,
  children,
}: {
  loading?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:opacity-60"
    >
      {loading ? 'Un momento…' : children}
    </button>
  )
}

// Mensaje de error de formulario (accesible).
export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {message}
    </p>
  )
}
