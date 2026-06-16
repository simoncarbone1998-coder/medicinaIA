import { useProfile } from '../lib/useProfile'
import DashboardLayout from '../components/DashboardLayout'

export default function DoctorAgenda() {
  const { profile } = useProfile()
  const name = profile?.full_name

  return (
    <DashboardLayout badge="Médico">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900">
        Agenda
      </h1>
      <p className="mt-2 text-stone-600">
        {name ? `Bienvenido/a, ${name}. ` : ''}Aquí gestionarás tu disponibilidad
        y tus citas.
      </p>
      <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-5 text-sm text-stone-600">
        Muy pronto podrás abrir tus horarios y atender pacientes. Estamos
        preparando esa parte.
      </div>
    </DashboardLayout>
  )
}
