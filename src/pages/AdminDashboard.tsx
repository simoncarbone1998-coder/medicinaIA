import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { formatSpanishDate } from '../lib/dates'
import DashboardLayout from '../components/DashboardLayout'
import { useToast } from '../components/Toast'
import {
  DangerButton,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '../components/ui'

export default function AdminDashboard() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Profile[]>([])
  const [rejectTarget, setRejectTarget] = useState<Profile | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchPending = useCallback(async (): Promise<Profile[]> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .eq('doctor_status', 'pending')
      .order('created_at', { ascending: true })
    return (data as Profile[]) ?? []
  }, [])

  useEffect(() => {
    let active = true
    fetchPending().then((rows) => {
      if (!active) return
      setPending(rows)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [fetchPending])

  // Recarga tras aprobar/rechazar (desde manejadores de eventos).
  const reload = useCallback(async () => {
    setPending(await fetchPending())
  }, [fetchPending])

  async function approve(doc: Profile) {
    setBusyId(doc.id)
    const { error } = await supabase
      .from('profiles')
      .update({ doctor_status: 'approved' })
      .eq('id', doc.id)
    setBusyId(null)
    if (error) {
      toast('No se pudo aprobar.', 'error')
      return
    }
    toast(`${doc.full_name ?? 'Médico'} aprobado`, 'success')
    reload()
  }

  async function reject() {
    if (!rejectTarget) return
    setBusyId(rejectTarget.id)
    // No hay columna de motivo de rechazo (lo recogemos por UX, no se persiste).
    const { error } = await supabase
      .from('profiles')
      .update({ doctor_status: 'rejected' })
      .eq('id', rejectTarget.id)
    setBusyId(null)
    const name = rejectTarget.full_name ?? 'Médico'
    setRejectTarget(null)
    setReason('')
    if (error) {
      toast('No se pudo rechazar.', 'error')
      return
    }
    toast(`${name} rechazado`, 'success')
    reload()
  }

  return (
    <DashboardLayout badge="Admin">
      <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight text-stone-900">
        Médicos por aprobar
      </h1>
      <p className="mb-6 text-stone-600">
        Revisa las credenciales y aprueba o rechaza cada solicitud.
      </p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center text-stone-600">
          No hay solicitudes pendientes. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((doc) => (
            <article
              key={doc.id}
              className="rounded-3xl border border-sand-200 bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-stone-900">{doc.full_name}</h2>
                  <p className="text-sm text-brand-700">{doc.specialty}</p>
                </div>
                <span className="rounded-full bg-clay-500/10 px-3 py-1 text-xs font-semibold text-clay-600">
                  Pendiente
                </span>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Universidad" value={doc.undergraduate_university} />
                <Row label="Tarjeta profesional" value={doc.medical_license} />
                <Row label="Correo" value={doc.email} />
                <Row label="Teléfono" value={doc.phone} />
                <Row label="Solicitud" value={formatSpanishDate(doc.created_at.slice(0, 10))} />
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <PrimaryButton
                  type="button"
                  onClick={() => approve(doc)}
                  disabled={busyId === doc.id}
                >
                  Aprobar
                </PrimaryButton>
                <DangerButton
                  type="button"
                  onClick={() => setRejectTarget(doc)}
                  disabled={busyId === doc.id}
                >
                  Rechazar
                </DangerButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {rejectTarget && (
        <Modal
          title="Rechazar solicitud"
          onClose={() => {
            setRejectTarget(null)
            setReason('')
          }}
        >
          <p className="text-sm text-stone-600">
            Vas a rechazar a <span className="font-semibold">{rejectTarget.full_name}</span>.
            Cuéntanos el motivo (uso interno).
          </p>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo del rechazo"
            className="mt-3 w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
          />
          <div className="mt-4 flex justify-end gap-2">
            <SecondaryButton
              type="button"
              onClick={() => {
                setRejectTarget(null)
                setReason('')
              }}
            >
              Cancelar
            </SecondaryButton>
            <DangerButton type="button" onClick={reject} disabled={busyId === rejectTarget.id}>
              Rechazar
            </DangerButton>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-stone-400">{label}:</dt>
      <dd className="font-medium text-stone-800">{value ?? '—'}</dd>
    </div>
  )
}
