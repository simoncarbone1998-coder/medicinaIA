import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_SPECIALTY } from '../lib/types'
import {
  formatSpanishDate,
  formatTime12,
  parseLocal,
  toDateKey,
} from '../lib/dates'
import { Modal, PrimaryButton, Skeleton } from './ui'

const MIN_REASON = 10
const DAYS_AHEAD = 14

type SlotRow = { date: string; start_time: string; end_time: string }
type TimeOption = { start_time: string; end_time: string }

// Pasos del asistente de reserva.
function StepDots({ step }: { step: number }) {
  return (
    <div className="mb-5 flex items-center gap-2" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1.5 flex-1 rounded-full ${
            n <= step ? 'bg-brand-600' : 'bg-sand-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function BookingModal({
  patientId,
  onClose,
  onBooked,
}: {
  patientId: string
  onClose: () => void
  onBooked: () => void
}) {
  // El paso 1 (especialidad) se resuelve solo: solo hay Medicina General.
  const [step, setStep] = useState<2 | 3>(2)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [slots, setSlots] = useState<SlotRow[]>([])
  const [selDate, setSelDate] = useState<string | null>(null)
  const [selStart, setSelStart] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Cargar horarios disponibles de los próximos 14 días.
  useEffect(() => {
    let mounted = true
    const today = new Date()
    const until = new Date()
    until.setDate(today.getDate() + DAYS_AHEAD)

    supabase
      .from('availability_slots')
      .select('date, start_time, end_time')
      .eq('specialty', DEFAULT_SPECIALTY)
      .eq('is_booked', false)
      .gte('date', toDateKey(today))
      .lte('date', toDateKey(until))
      .order('date')
      .order('start_time')
      .then(({ data }) => {
        if (!mounted) return
        // Descartamos los horarios que ya pasaron (hora actual evaluada aquí,
        // fuera del render).
        const now = new Date().getTime()
        const rows = ((data as SlotRow[]) ?? []).filter(
          (s) => parseLocal(s.date, s.start_time).getTime() > now,
        )
        setSlots(rows)
        setLoadingSlots(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Agrupar por fecha, con horas únicas (sin revelar médicos).
  const byDate = useMemo(() => {
    const map = new Map<string, Map<string, TimeOption>>()
    for (const s of slots) {
      if (!map.has(s.date)) map.set(s.date, new Map())
      const times = map.get(s.date)!
      if (!times.has(s.start_time)) {
        times.set(s.start_time, { start_time: s.start_time, end_time: s.end_time })
      }
    }
    return [...map.entries()]
      .map(([date, times]) => ({
        date,
        times: [...times.values()].sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [slots])

  function chooseTime(date: string, start: string) {
    setSelDate(date)
    setSelStart(start)
    setError('')
    setStep(3)
  }

  async function confirm() {
    if (!selDate || !selStart) return
    if (reason.trim().length < MIN_REASON) {
      setError(`Cuéntanos un poco más (mínimo ${MIN_REASON} caracteres).`)
      return
    }
    setSubmitting(true)
    setError('')

    // Buscar TODOS los espacios disponibles para esa fecha+hora y asignar uno al
    // azar (el paciente no elige médico). Si el azar choca con uno recién tomado,
    // reintentamos con otro candidato.
    const { data, error: slotErr } = await supabase
      .from('availability_slots')
      .select('id, doctor_id')
      .eq('specialty', DEFAULT_SPECIALTY)
      .eq('is_booked', false)
      .eq('date', selDate)
      .eq('start_time', selStart)

    if (slotErr) {
      setSubmitting(false)
      setError('No se pudo confirmar la cita. Inténtalo de nuevo.')
      return
    }

    const candidates = (data as { id: string; doctor_id: string }[]) ?? []
    while (candidates.length) {
      const i = Math.floor(Math.random() * candidates.length)
      const slot = candidates[i]
      const { error: insErr } = await supabase.from('appointments').insert({
        patient_id: patientId,
        doctor_id: slot.doctor_id,
        slot_id: slot.id,
        status: 'confirmed',
        reason: reason.trim(),
      })
      if (!insErr) {
        setSubmitting(false)
        onBooked()
        return
      }
      // 23505 = ese espacio se acaba de ocupar; probamos con otro candidato.
      if (insErr.code === '23505') {
        candidates.splice(i, 1)
        continue
      }
      setSubmitting(false)
      setError('No se pudo confirmar la cita. Inténtalo de nuevo.')
      return
    }

    setSubmitting(false)
    setError('Ese horario se acaba de ocupar. Elige otro, por favor.')
    setStep(2)
  }

  return (
    <Modal title="Agendar consulta" onClose={onClose}>
      <StepDots step={step} />

      {step === 2 && (
        <div>
          <p className="mb-1 text-sm font-medium text-stone-800">
            Elige fecha y hora
          </p>
          <p className="mb-4 text-sm text-stone-500">
            Consulta de medicina general.
          </p>

          {loadingSlots ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : byDate.length === 0 ? (
            <p className="rounded-xl bg-sand-50 p-4 text-sm text-stone-600">
              No hay horarios disponibles. Intenta más adelante.
            </p>
          ) : (
            <div className="max-h-[50dvh] space-y-5 overflow-y-auto pr-1">
              {byDate.map(({ date, times }) => (
                <div key={date}>
                  <h3 className="mb-2 text-sm font-semibold text-stone-900">
                    {formatSpanishDate(date)}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {times.map((t) => (
                      <button
                        key={t.start_time}
                        type="button"
                        onClick={() => chooseTime(date, t.start_time)}
                        className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
                      >
                        {formatTime12(t.start_time)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
        </div>
      )}

      {step === 3 && selDate && selStart && (
        <div>
          <button
            type="button"
            onClick={() => {
              setStep(2)
              setError('')
            }}
            className="mb-3 text-sm font-medium text-brand-700"
          >
            ← Cambiar fecha
          </button>
          <div className="mb-4 rounded-xl bg-sand-50 p-3 text-sm text-stone-700">
            {formatSpanishDate(selDate)} · {formatTime12(selStart)}
          </div>

          <label
            htmlFor="reason"
            className="block text-sm font-medium text-stone-800"
          >
            ¿Cuál es el motivo de tu consulta?
          </label>
          <textarea
            id="reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cuéntanos brevemente qué sientes."
            className="mt-1.5 w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
          />
          <p className="mt-1 text-right text-xs text-stone-400">
            {reason.trim().length}/{MIN_REASON} mín.
          </p>

          {error && <p className="mb-2 text-sm font-medium text-red-700">{error}</p>}

          <PrimaryButton
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="mt-2 w-full"
          >
            {submitting ? 'Confirmando…' : 'Confirmar cita'}
          </PrimaryButton>
        </div>
      )}
    </Modal>
  )
}
