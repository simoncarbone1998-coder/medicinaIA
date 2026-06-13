import { Link, Navigate } from 'react-router-dom'
import { useSession } from '../lib/useSession'

// Marca: pequeño distintivo de salud (una cruz dentro de un cuadro redondeado).
function BrandMark() {
  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M10 3h4a1 1 0 0 1 1 1v5h5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5v5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h5V4a1 1 0 0 1 1-1Z" />
      </svg>
    </span>
  )
}

// Cada paso del "cómo funciona": número grande + título corto + frase simple.
function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: string
}) {
  return (
    <li className="flex gap-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-semibold text-teal-700"
        aria-hidden="true"
      >
        {n}
      </span>
      <div className="space-y-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-pretty text-slate-600">{children}</p>
      </div>
    </li>
  )
}

// Punto de confianza: título corto + frase.
function TrustPoint({ title, children }: { title: string; children: string }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-teal-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{children}</p>
    </li>
  )
}

export default function Landing() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-slate-500">Cargando…</p>
      </main>
    )
  }

  // Si ya hay sesión, esta página pública lleva al espacio del paciente.
  if (session) {
    return <Navigate to="/paciente" replace />
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
        {/* Marca */}
        <header className="flex items-center gap-2">
          <BrandMark />
          <span className="text-lg font-semibold tracking-tight">Contigo</span>
        </header>

        <main className="flex-1">
          {/* Hero: la confianza primero — un médico real revisa y aprueba. */}
          <section className="mt-10 space-y-4">
            <h1 className="text-pretty text-3xl font-bold leading-tight text-slate-900">
              Un médico real revisa y aprueba tu consulta.
            </h1>
            <p className="text-pretty text-lg text-slate-600">
              Cuenta tus síntomas por chat y recibe orientación médica
              confiable, rápida y a bajo costo. Desde tu teléfono.
            </p>

            <div className="space-y-3 pt-2">
              <Link
                to="/entrar?modo=crear"
                className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Crear cuenta
              </Link>
              <Link
                to="/entrar?modo=entrar"
                className="flex w-full items-center justify-center rounded-xl border border-teal-600 bg-white px-4 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Iniciar sesión
              </Link>
            </div>
          </section>

          {/* Aviso de emergencias: visible e imposible de ignorar. */}
          <aside
            role="note"
            className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4"
          >
            <p className="text-sm text-rose-900">
              <strong className="font-semibold">
                Esto no es para emergencias.
              </strong>{' '}
              Si tienes dolor de pecho, dificultad para respirar, sangrado
              fuerte u otra señal grave, llama de inmediato al{' '}
              <a href="tel:123" className="font-bold underline">
                123
              </a>{' '}
              o ve al servicio de urgencias más cercano.
            </p>
          </aside>

          {/* Qué es */}
          <section className="mt-10 space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Qué es Contigo</h2>
            <p className="text-pretty text-slate-600">
              Es una consulta de medicina general por chat, revisada y
              certificada por un médico real. Si necesitas medicamentos, te los
              podemos enviar.
            </p>
          </section>

          {/* Cómo funciona, en 3 pasos */}
          <section className="mt-10 space-y-5">
            <h2 className="text-xl font-bold text-slate-900">Cómo funciona</h2>
            <ol className="space-y-5">
              <Step n={1} title="Cuentas tus síntomas">
                Hablas por chat sobre lo que sientes, con calma y en español.
              </Step>
              <Step n={2} title="Un médico real revisa y aprueba">
                Un médico con licencia revisa tu caso y aprueba la
                recomendación.
              </Step>
              <Step n={3} title="Recibes tu resultado">
                Te llega tu recomendación y, si la necesitas, tu medicación.
              </Step>
            </ol>
          </section>

          {/* Por qué confiar */}
          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Por qué puedes confiar
            </h2>
            <ul className="grid gap-3">
              <TrustPoint title="Un médico real certifica">
                Cada consulta la aprueba un médico con licencia. Nada es
                definitivo hasta que él lo certifica.
              </TrustPoint>
              <TrustPoint title="Precio accesible">
                Atención de medicina general a un costo bajo.
              </TrustPoint>
              <TrustPoint title="Desde tu teléfono">
                Sin filas ni viajes. Donde estés, cuando lo necesites.
              </TrustPoint>
            </ul>
          </section>
        </main>

        {/* Nota honesta y modesta sobre el alcance del servicio. */}
        <footer className="mt-12 border-t border-slate-200 pt-6">
          <p className="text-xs leading-relaxed text-slate-500">
            Contigo ofrece orientación de medicina general y no reemplaza una
            consulta presencial cuando es necesaria. Toda recomendación es
            revisada por un médico con licencia antes de ser entregada.
          </p>
        </footer>
      </div>
    </div>
  )
}
