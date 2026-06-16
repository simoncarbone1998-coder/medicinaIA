import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Aplicar from './pages/Aplicar'
import DoctorPending from './pages/DoctorPending'
import PacienteMiSalud from './pages/PacienteMiSalud'
import DoctorAgenda from './pages/DoctorAgenda'
import AdminDashboard from './pages/AdminDashboard'
import RequireRole from './components/RequireRole'

function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-xl font-semibold text-stone-900">
        Página no encontrada
      </h1>
      <Link className="text-brand-700 underline" to="/">
        Volver al inicio
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/aplicar" element={<Aplicar />} />
      <Route path="/doctor/pending" element={<DoctorPending />} />

      {/* Paciente (protegida) */}
      <Route
        path="/paciente/mi-salud"
        element={
          <RequireRole role="patient">
            <PacienteMiSalud />
          </RequireRole>
        }
      />
      <Route
        path="/paciente/dashboard"
        element={<Navigate to="/paciente/mi-salud" replace />}
      />

      {/* Médico (protegida, solo aprobados) */}
      <Route
        path="/doctor/agenda"
        element={
          <RequireRole role="doctor">
            <DoctorAgenda />
          </RequireRole>
        }
      />

      {/* Admin (protegida) */}
      <Route
        path="/admin/dashboard"
        element={
          <RequireRole role="admin">
            <AdminDashboard />
          </RequireRole>
        }
      />

      {/* Redirecciones de rutas antiguas */}
      <Route path="/entrar" element={<Navigate to="/login" replace />} />
      <Route path="/paciente" element={<Navigate to="/paciente/mi-salud" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
