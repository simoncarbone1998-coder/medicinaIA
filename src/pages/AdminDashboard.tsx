import { useProfile } from '../lib/useProfile'
import DashboardLayout from '../components/DashboardLayout'

export default function AdminDashboard() {
  const { profile } = useProfile()
  const name = profile?.full_name?.split(' ')[0]

  return (
    <DashboardLayout badge="Admin">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900">
        Admin
      </h1>
      <p className="mt-2 text-stone-600">
        {name ? `Hola, ${name}. ` : ''}Desde aquí gestionarás médicos, pacientes y
        operaciones.
      </p>
      <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-5 text-sm text-stone-600">
        El panel de administración se construye en un paso posterior.
      </div>
    </DashboardLayout>
  )
}
