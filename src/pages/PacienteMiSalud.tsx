import { useProfile } from '../lib/useProfile'
import DashboardLayout from '../components/DashboardLayout'

export default function PacienteMiSalud() {
  const { profile } = useProfile()
  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <DashboardLayout badge="Paciente">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900">
        Mi Salud
      </h1>
      <p className="mt-2 text-stone-600">
        {firstName ? `Hola, ${firstName}. ` : ''}Aquí verás tus consultas y podrás
        agendar tu cita.
      </p>
      <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-5 text-sm text-stone-600">
        Muy pronto podrás reservar una cita con un médico. Estamos preparando esa
        parte.
      </div>
    </DashboardLayout>
  )
}
