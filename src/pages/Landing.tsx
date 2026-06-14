import { Link, Navigate } from 'react-router-dom'
import { useSession } from '../lib/useSession'

/* Fotos reales (Pexels, uso libre):
   - Hero:    https://www.pexels.com/photo/6697318/
   - Misión:  https://www.pexels.com/photo/6838547/                       */
const HERO_BASE =
  'https://images.pexels.com/photos/6697318/pexels-photo-6697318.jpeg?auto=compress&cs=tinysrgb'
const MISSION_BASE =
  'https://images.pexels.com/photos/6838547/pexels-photo-6838547.jpeg?auto=compress&cs=tinysrgb'

// Genera un srcSet responsivo a partir de la URL base de Pexels.
function srcSet(base: string, widths: number[]) {
  return widths.map((w) => `${base}&w=${w} ${w}w`).join(', ')
}

/* ---------- Iconos (inline SVG, ligeros y nítidos) ---------- */
type IconProps = { className?: string }
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function IconChat({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 20l1.4-4.5a8.38 8.38 0 0 1-.9-4A8.5 8.5 0 0 1 21 11.5Z" />
    </svg>
  )
}
function IconShieldCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M12 3 5 6v5c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
function IconHeartHand({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M12 21s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 9a3.7 3.7 0 0 1 7 2.7C19 16.6 12 21 12 21Z" />
    </svg>
  )
}
function IconPhone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  )
}
function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  )
}
function IconWallet({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h12a2 2 0 0 1 2 2V8" />
      <path d="M3.5 7.5v9a2 2 0 0 0 2 2h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18.5 8.5H5.5" />
      <circle cx="16.5" cy="12.5" r="1.25" />
    </svg>
  )
}
function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="m5 12.5 4.5 4.5L19 6.5" />
    </svg>
  )
}
function IconAlert({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M12 4.5 2.5 20h19L12 4.5Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IconArrow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/* ---------- Piezas reutilizables ---------- */
function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      Contigo<span className="text-clay-500">.</span>
    </span>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-600">
      <span className="h-1.5 w-1.5 rounded-full bg-clay-500" aria-hidden="true" />
      {children}
    </p>
  )
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: number
  icon: React.ReactNode
  title: string
  children: string
}) {
  return (
    <li className="relative rounded-3xl border border-sand-200 bg-white p-7">
      <div className="flex items-center justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {icon}
        </span>
        <span className="font-display text-4xl font-semibold text-sand-300">
          {n}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-pretty text-stone-600">{children}</p>
    </li>
  )
}

function Benefit({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: string
}) {
  return (
    <article className="flex gap-4 rounded-3xl border border-sand-200 bg-white p-6 transition-shadow hover:shadow-md hover:shadow-brand-900/5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {icon}
      </span>
      <div>
        <h3 className="font-semibold text-stone-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">{children}</p>
      </div>
    </article>
  )
}

/* ---------- Página ---------- */
export default function Landing() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-stone-500">Cargando…</p>
      </main>
    )
  }

  // Página pública: con sesión activa, al espacio del paciente.
  if (session) {
    return <Navigate to="/paciente" replace />
  }

  const primaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50'
  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3.5 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50'

  return (
    <div className="min-h-dvh bg-sand-50 text-stone-700">
      {/* ---------- Barra superior ---------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark className="text-2xl text-brand-800" />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/entrar?modo=entrar"
            className="rounded-full px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:text-brand-700"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/entrar?modo=crear"
            className="hidden rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="mx-auto max-w-6xl px-5 pb-4 pt-6 sm:px-8 sm:pt-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14 lg:pb-12 lg:pt-16">
          <div className="max-w-xl">
            <Eyebrow>Salud primaria para todos</Eyebrow>
            <h1 className="mt-5 font-display text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
              Atención médica de confianza, desde tu teléfono.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-stone-600">
              Cuéntale tus síntomas a Contigo por chat. Un médico con licencia
              revisa y aprueba tu consulta. Cuidado cercano, rápido y a un precio
              justo.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/entrar?modo=crear" className={primaryBtn}>
                Crear cuenta
                <IconArrow className="h-5 w-5" />
              </Link>
              <Link to="/entrar?modo=entrar" className={secondaryBtn}>
                Iniciar sesión
              </Link>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-stone-500">
              <IconShieldCheck className="h-5 w-5 text-brand-600" />
              Cada consulta es revisada por un médico con licencia.
            </p>
          </div>

          {/* Imagen del hero */}
          <div className="relative mt-10 lg:mt-0">
            <div className="relative overflow-hidden rounded-[2rem] bg-sand-100 shadow-xl shadow-brand-900/10 ring-1 ring-black/5">
              <img
                src={`${HERO_BASE}&w=900`}
                srcSet={srcSet(HERO_BASE, [480, 640, 800, 1000])}
                sizes="(min-width: 1024px) 30rem, 100vw"
                width={800}
                height={1000}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                alt="Una mujer sonríe mientras usa su teléfono cómodamente en casa"
                className="aspect-[4/5] h-full w-full object-cover"
              />
            </div>
            {/* Chip flotante de confianza */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg shadow-brand-900/10 backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                <IconCheck className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-stone-800">
                Aprobado por un médico
              </span>
            </div>
          </div>
        </section>

        {/* ---------- Aviso: no es para emergencias ---------- */}
        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <aside
            role="note"
            className="flex items-start gap-4 rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:items-center"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <IconAlert className="h-6 w-6" />
            </span>
            <p className="text-sm leading-relaxed text-stone-700">
              <span className="font-semibold text-stone-900">
                Esto no es para emergencias.
              </span>{' '}
              Si tienes dolor de pecho, dificultad para respirar, sangrado fuerte
              u otra señal grave, llama de inmediato al{' '}
              <a
                href="tel:123"
                className="font-bold text-red-600 underline underline-offset-2"
              >
                123
              </a>{' '}
              o ve al servicio de urgencias más cercano.
            </p>
          </aside>
        </section>

        {/* ---------- Cómo funciona ---------- */}
        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="max-w-2xl">
            <Eyebrow>Cómo funciona</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Tu consulta en tres pasos simples
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            <Step n={1} icon={<IconChat className="h-6 w-6" />} title="Cuéntanos qué sientes">
              Hablas por chat sobre tus síntomas, con calma y en español. Sin
              apuros.
            </Step>
            <Step
              n={2}
              icon={<IconShieldCheck className="h-6 w-6" />}
              title="Un médico revisa y aprueba"
            >
              Un médico con licencia revisa tu caso y aprueba la recomendación.
            </Step>
            <Step
              n={3}
              icon={<IconHeartHand className="h-6 w-6" />}
              title="Recibes tu cuidado"
            >
              Te llega tu recomendación y, si la necesitas, tu medicación hasta tu
              casa.
            </Step>
          </ol>
        </section>

        {/* ---------- Por qué confiar ---------- */}
        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="max-w-2xl">
            <Eyebrow>Por qué Contigo</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Pensado para cuidarte de verdad
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <Benefit
              icon={<IconShieldCheck className="h-6 w-6" />}
              title="Un médico real certifica"
            >
              Ninguna recomendación es definitiva hasta que un médico con licencia
              la revisa y la aprueba.
            </Benefit>
            <Benefit icon={<IconWallet className="h-6 w-6" />} title="Precio justo">
              Atención de medicina general a un costo que sí puedes pagar.
            </Benefit>
            <Benefit
              icon={<IconPhone className="h-6 w-6" />}
              title="Desde cualquier teléfono"
            >
              Sin filas ni viajes. Funciona en teléfonos sencillos y con datos
              limitados.
            </Benefit>
            <Benefit
              icon={<IconLock className="h-6 w-6" />}
              title="Privado y seguro"
            >
              Tu información de salud se cuida y se mantiene privada, solo para tu
              atención.
            </Benefit>
          </div>
        </section>

        {/* ---------- Misión ---------- */}
        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="overflow-hidden rounded-[2.5rem] border border-sand-200 bg-white lg:grid lg:grid-cols-2 lg:items-stretch">
            <div className="order-2 p-8 sm:p-12 lg:order-1 lg:flex lg:flex-col lg:justify-center">
              <Eyebrow>Nuestra misión</Eyebrow>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                Salud digna, al alcance de todos
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-stone-600">
                Creemos que toda persona merece atención médica cercana y
                confiable, sin importar dónde viva ni cuánto gane. Por eso Contigo
                une la rapidez de la tecnología con el criterio de médicos reales.
              </p>
              <p className="mt-4 leading-relaxed text-stone-600">
                Tú cuentas lo que sientes. Nosotros nos encargamos de que un
                profesional lo revise. Siempre con respeto y con cuidado.
              </p>
            </div>
            <div className="order-1 lg:order-2">
              <img
                src={`${MISSION_BASE}&w=900`}
                srcSet={srcSet(MISSION_BASE, [480, 640, 800, 1000])}
                sizes="(min-width: 1024px) 36rem, 100vw"
                width={800}
                height={800}
                loading="lazy"
                decoding="async"
                alt="Una mujer mayor usa su teléfono al aire libre, tranquila y a gusto"
                className="h-64 w-full object-cover object-center sm:h-80 lg:h-full"
              />
            </div>
          </div>
        </section>

        {/* ---------- Llamado final ---------- */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-4 sm:px-8 sm:pb-24">
          <div className="rounded-[2.5rem] bg-brand-800 px-7 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Tu salud no puede esperar. Empieza hoy.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-brand-100">
              Crea tu cuenta en minutos y haz tu primera consulta desde donde
              estés.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/entrar?modo=crear"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-brand-800 shadow-sm transition-colors hover:bg-sand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
              >
                Crear cuenta
                <IconArrow className="h-5 w-5" />
              </Link>
              <Link
                to="/entrar?modo=entrar"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Pie ---------- */}
      <footer className="border-t border-sand-200 bg-sand-100">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="max-w-xs">
              <Wordmark className="text-2xl text-brand-800" />
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Atención médica primaria por chat, revisada y aprobada por
                médicos con licencia.
              </p>
            </div>

            <nav aria-label="Producto">
              <h3 className="text-sm font-semibold text-stone-900">Producto</h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>
                  <Link to="/entrar?modo=crear" className="hover:text-brand-700">
                    Crear cuenta
                  </Link>
                </li>
                <li>
                  <Link to="/entrar?modo=entrar" className="hover:text-brand-700">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Cómo funciona
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <h3 className="text-sm font-semibold text-stone-900">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Política de privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Términos del servicio
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Tratamiento de datos (Habeas Data)
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Contacto">
              <h3 className="text-sm font-semibold text-stone-900">Contacto</h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Escríbenos
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 border-t border-sand-200 pt-6">
            <p className="text-xs leading-relaxed text-stone-500">
              Contigo ofrece orientación de medicina general y no reemplaza una
              consulta presencial cuando es necesaria. No es un servicio de
              urgencias: ante una emergencia llama al 123. Toda recomendación es
              revisada por un médico con licencia antes de ser entregada.
            </p>
            <p className="mt-4 text-xs text-stone-500">
              © 2026 Contigo · Hecho con cuidado en Colombia
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
