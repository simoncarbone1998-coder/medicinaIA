import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../lib/useProfile'
import type { AppointmentWithDoctor } from '../lib/types'
import { canJoinNow, formatLongDateTime, formatSpanishDate, parseLocal } from '../lib/dates'
import DashboardLayout from '../components/DashboardLayout'
import BookingModal from '../components/BookingModal'
import { useToast } from '../components/Toast'
import {
  DangerButton,
  InitialsAvatar,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '../components/ui'

const APPT_SELECT = `
  *,
  slot:availability_slots(date, start_time, end_time),
  doctor:profiles!appointments_doctor_id_fkey(full_name, specialty)
`

export default function PacienteMiSalud() {
  const { profile } = useProfile()
  const navigate = useNavigate()
  const toast = useToast()
  const patientId = profile?.id

  const [loading, setLoading] = useState(true)
  const [appts, setAppts] = useState<AppointmentWithDoctor[]>([])
  const [booking, setBooking] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<AppointmentWithDoctor | null>(null)
  const [cancelling, setCancelling] = useState(false)
  // Tick para reevaluar la ventana de "Unirse" sin recargar (no guarda la hora).
  const [, setTick] = useState(0)

  const fetchAppts = useCallback(async (): Promise<AppointmentWithDoctor[]> => {
    if (!patientId) return []
    const { data } = await supabase
      .from('appointments')
      .select(APPT_SELECT)
      .eq('patient_id', patientId)
      .eq('status', 'confirmed')
    return (data as AppointmentWithDoctor[]) ?? []
  }, [patientId])

  // Carga inicial (setState dentro del callback de la promesa).
  useEffect(() => {
    if (!patientId) return
    let active = true
    fetchAppts().then((rows) => {
      if (!active) return
      setAppts(rows)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [patientId, fetchAppts])

  // Recarga tras una acción del usuario (se invoca desde manejadores).
  const reload = useCallback(async () => {
    setAppts(await fetchAppts())
  }, [fetchAppts])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  function slotTime(a: AppointmentWithDoctor): number {
    return a.slot ? parseLocal(a.slot.date, a.slot.start_time).getTime() : 0
  }

  const upcoming = appts
    .filter((a) => !a.completed)
    .sort((a, b) => slotTime(a) - slotTime(b))
  const past = appts
    .filter((a) => a.completed)
    .sort((a, b) => slotTime(b) - slotTime(a))

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', cancelTarget.id)
    setCancelling(false)
    setCancelTarget(null)
    if (error) {
      toast('No se pudo cancelar. Inténtalo de nuevo.', 'error')
      return
    }
    toast('Cita cancelada', 'success')
    reload()
  }

  return (
    <DashboardLayout badge="Paciente">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900">
            Mi Salud
          </h1>
          <p className="mt-1 text-stone-600">Tus consultas con un médico general.</p>
        </div>
        {!loading && upcoming.length > 0 && (
          <PrimaryButton type="button" onClick={() => setBooking(true)}>
            + Agendar otra
          </PrimaryButton>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <EmptyState onBook={() => setBooking(true)} />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section className="space-y-4">
              {upcoming.map((a) => (
                <UpcomingCard
                  key={a.id}
                  appt={a}
                  onJoin={() => navigate(`/paciente/consulta/${a.id}`)}
                  onCancel={() => setCancelTarget(a)}
                />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
                Consultas anteriores
              </h2>
              <div className="space-y-3">
                {past.map((a) => (
                  <PastCard key={a.id} appt={a} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {booking && patientId && (
        <BookingModal
          patientId={patientId}
          onClose={() => setBooking(false)}
          onBooked={() => {
            setBooking(false)
            toast('¡Cita confirmada!', 'success')
            reload()
          }}
        />
      )}

      {cancelTarget && (
        <Modal title="Cancelar cita" onClose={() => setCancelTarget(null)}>
          <p className="text-stone-600">
            ¿Seguro que quieres cancelar tu consulta
            {cancelTarget.slot
              ? ` del ${formatLongDateTime(cancelTarget.slot.date, cancelTarget.slot.start_time)}`
              : ''}
            ? El horario quedará libre para otra persona.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setCancelTarget(null)}>
              No, volver
            </SecondaryButton>
            <DangerButton type="button" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
            </DangerButton>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}

function EmptyState({ onBook }: { onBook: () => void }) {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4M12 13v4M10 15h4" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-semibold text-stone-900">
        Agenda tu primera consulta con un médico general
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-pretty text-stone-600">
        Elige el día y la hora que más te convenga. Te asignamos un médico con
        licencia.
      </p>
      <PrimaryButton type="button" onClick={onBook} className="mt-6">
        Agendar consulta
      </PrimaryButton>
    </div>
  )
}

function UpcomingCard({
  appt,
  onJoin,
  onCancel,
}: {
  appt: AppointmentWithDoctor
  onJoin: () => void
  onCancel: () => void
}) {
  const canJoin = appt.slot
    ? canJoinNow(appt.slot.date, appt.slot.start_time, appt.slot.end_time)
    : false

  return (
    <article className="rounded-3xl border border-sand-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <InitialsAvatar name={appt.doctor?.full_name ?? null} className="h-12 w-12 text-base" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-stone-900">
            {appt.doctor?.full_name ?? 'Médico asignado'}
          </h3>
          <p className="text-sm text-stone-500">
            {appt.doctor?.specialty ?? 'Medicina General'}
          </p>
          {appt.slot && (
            <p className="mt-2 text-sm font-medium text-stone-800">
              {formatLongDateTime(appt.slot.date, appt.slot.start_time)}
            </p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
          Confirmada
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <PrimaryButton type="button" onClick={onJoin} disabled={!canJoin}>
          Unirse a la consulta
        </PrimaryButton>
        <DangerButton type="button" onClick={onCancel}>
          Cancelar
        </DangerButton>
        {!canJoin && (
          <span className="text-xs text-stone-500">
            Podrás unirte 5 minutos antes de tu cita.
          </span>
        )}
      </div>
    </article>
  )
}

function PastCard({ appt }: { appt: AppointmentWithDoctor }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-stone-900">
            {appt.doctor?.full_name ?? 'Médico'}{' '}
            <span className="font-normal text-stone-500">
              · {appt.doctor?.specialty ?? 'Medicina General'}
            </span>
          </p>
          {appt.slot && (
            <p className="text-sm text-stone-500">{formatSpanishDate(appt.slot.date)}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
          Completada
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 border-t border-sand-200 px-5 py-4 text-sm">
          <div>
            <p className="font-semibold text-stone-700">Motivo</p>
            <p className="text-stone-600">{appt.reason || 'No registrado.'}</p>
          </div>
          <div>
            <p className="font-semibold text-stone-700">Resumen del médico</p>
            <p className="text-stone-600">
              {appt.summary || 'El médico no dejó un resumen escrito.'}
            </p>
          </div>
        </div>
      )}
    </article>
  )
}
