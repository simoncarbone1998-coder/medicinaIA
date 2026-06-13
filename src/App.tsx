import { Routes, Route, Link } from 'react-router-dom'
import Landing from './pages/Landing'
import Entrar from './pages/Entrar'
import Paciente from './pages/Paciente'

function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-xl font-semibold text-slate-900">
        Página no encontrada
      </h1>
      <Link className="text-teal-700 underline" to="/">
        Volver al inicio
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/paciente" element={<Paciente />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
