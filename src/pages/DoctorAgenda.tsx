import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../lib/useProfile'
import { DEFAULT_SPECIALTY } from '../lib/types'
import type { AppointmentWithPatient, AvailabilitySlot } from '../lib/types'
import {
  addHalfHour,
  ageFromBirthDate,
  formatTime12,
  halfHourOptions,
  monthGrid,
  monthLabel,
  mondayFirstIndex,
  timeToMinutes,
  toDateKey,
  WEEKDAY_LABELS,
} from '../lib/dates'
import DashboardLayout from '../components/DashboardLayout'
import { useToast } from '../components/Toast'
import {
  DangerButton,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '../components/ui'

type DayBucket = {
  available: AvailabilitySlot[]
  booked: AppointmentWithPatient[]
  completed: AppointmentWithPatient[]
}

const APPT_SELECT = `
  *,
  slot:availability_slots(date, start_time, end_time),
  patient:profiles!appointments_patient_id_fkey(full_name, phone, birth_date)
`

// Genera las horas de inicio (30 min) entre start y end ('HH:MM').
function halfHourStarts(start: string, end: string): string[] {
  const out: string[] = []
  let t = start
  while (timeToMinutes(t) + 30 <= timeToMinutes(end)) {
    out.push(t)
    t = addHalfHour(t)
  }
  return out
}

export default function DoctorAgenda() {
  const { profile } = useProfile()
  const navigate = useNavigate()
  const toast = useToast()
  const doctorId = profile?.id

  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [appts, setAppts] = useState<AppointmentWithPatient[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null)
  // Fecha del formulario "Día específico"; se prefija al hacer clic en el calendario.
  const [specificDate, setSpecificDate] = useState('')

  const fetchData = useCallback(async (): Promise<{
    slots: AvailabilitySlot[]
    appts: AppointmentWithPatient[]
  }> => {
    if (!doctorId) return { slots: [], appts: [] }
    const [slotRes, apptRes] = await Promise.all([
      supabase.from('availability_slots').select('*').eq('doctor_id', doctorId),
      supabase
        .from('appointments')
        .select(APPT_SELECT)
        .eq('doctor_id', doctorId)
        .eq('status', 'confirmed'),
    ])
    return {
      slots: (slotRes.data as AvailabilitySlot[]) ?? [],
      appts: (apptRes.data as AppointmentWithPatient[]) ?? [],
    }
  }, [doctorId])

  useEffect(() => {
    if (!doctorId) return
    let active = true
    fetchData().then(({ slots, appts }) => {
      if (!active) return
      setSlots(slots)
      setAppts(appts)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [doctorId, fetchData])

  // Recarga tras una acción (desde manejadores de eventos).
  const load = useCallback(async () => {
    const { slots, appts } = await fetchData()
    setSlots(slots)
    setAppts(appts)
  }, [fetchData])

  // Mapa fecha -> cubos de pills.
  const byDate = useMemo(() => {
    const map = new Map<string, DayBucket>()
    const ensure = (d: string) => {
      if (!map.has(d)) map.set(d, { available: [], booked: [], completed: [] })
      return map.get(d)!
    }
    for (const s of slots) {
      if (!s.is_booked) ensure(s.date).available.push(s)
    }
    for (const a of appts) {
      if (!a.slot) continue
      const bucket = ensure(a.slot.date)
      if (a.completed) bucket.completed.push(a)
      else bucket.booked.push(a)
    }
    // Orden por hora dentro de cada día.
    for (const b of map.values()) {
      b.available.sort((x, y) => x.start_time.localeCompare(y.start_time))
      const byStart = (x: AppointmentWithPatient, y: AppointmentWithPatient) =>
        (x.slot?.start_time ?? '').localeCompare(y.slot?.start_time ?? '')
      b.booked.sort(byStart)
      b.completed.sort(byStart)
    }
    return map
  }, [slots, appts])

  const selectedAppt = appts.find((a) => a.id === selectedApptId) ?? null
  const weeks = monthGrid(view.year, view.month)
  const todayKey = toDateKey(new Date())

  function changeMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // --- acciones sobre la cita seleccionada ---
  async function cancelAppt(id: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) return toast('No se pudo cancelar.', 'error')
    toast('Cita cancelada', 'success')
    setSelectedApptId(null)
    load()
  }

  async function completeAppt(id: string, summary: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ completed: true, completed_at: new Date().toISOString(), summary })
      .eq('id', id)
    if (error) return toast('No se pudo guardar el resumen.', 'error')
    toast('Cita completada', 'success')
    load()
  }

  async function deleteSlot(id: string) {
    const { error } = await supabase.from('availability_slots').delete().eq('id', id)
    if (error) return toast('No se pudo eliminar el espacio.', 'error')
    toast('Espacio eliminado', 'success')
    load()
  }

  return (
    <DashboardLayout badge="Médico">
      <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight text-stone-900">
        Agenda
      </h1>
      <p className="mb-6 text-stone-600">
        Gestiona tu disponibilidad y tus citas de medicina general.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Calendario */}
        <div className="rounded-3xl border border-sand-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-full p-2 text-stone-500 hover:bg-sand-100"
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <h2 className="font-display text-lg font-semibold text-stone-900">
              {monthLabel(view.year, view.month)}
            </h2>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-full p-2 text-stone-500 hover:bg-sand-100"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-stone-400">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {weeks.flat().map((day) => {
                const key = toDateKey(day)
                const inMonth = day.getMonth() === view.month
                const bucket = byDate.get(key)
                const isSelected = key === selectedDate
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(key)
                      setSpecificDate(key)
                      setSelectedApptId(null)
                    }}
                    className={`min-h-[68px] rounded-xl border p-1 text-left align-top transition-colors ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-sand-200 hover:bg-sand-50'
                    } ${inMonth ? '' : 'opacity-40'}`}
                  >
                    <span
                      className={`block text-xs font-semibold ${
                        key === todayKey ? 'text-brand-700' : 'text-stone-600'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <span className="mt-0.5 flex flex-col gap-0.5">
                      {bucket?.booked.slice(0, 2).map((a) => (
                        <Pill
                          key={a.id}
                          color="blue"
                          label={firstName(a.patient?.full_name)}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDate(key)
                            setSelectedApptId(a.id)
                          }}
                        />
                      ))}
                      {bucket?.completed.slice(0, 1).map((a) => (
                        <Pill
                          key={a.id}
                          color="gray"
                          label={`${firstName(a.patient?.full_name)} ✓`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDate(key)
                            setSelectedApptId(a.id)
                          }}
                        />
                      ))}
                      {bucket?.available.slice(0, 1).map((s) => (
                        <Pill
                          key={s.id}
                          color="green"
                          label={formatTime12(s.start_time)}
                        />
                      ))}
                      <Overflow bucket={bucket} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <Legend />
        </div>

        {/* Barra lateral */}
        <div className="space-y-5">
          <AvailabilityForm
            doctorId={doctorId}
            date={specificDate}
            onDateChange={setSpecificDate}
            onCreated={load}
          />

          {selectedAppt ? (
            <PatientDetail
              appt={selectedAppt}
              onBack={() => setSelectedApptId(null)}
              onStart={() => navigate(`/doctor/consulta/${selectedAppt.id}`)}
              onCancel={() => cancelAppt(selectedAppt.id)}
              onComplete={(summary) => completeAppt(selectedAppt.id, summary)}
            />
          ) : (
            selectedDate && (
              <DayDetail
                dateKey={selectedDate}
                bucket={byDate.get(selectedDate)}
                onSelectAppt={setSelectedApptId}
                onDeleteSlot={deleteSlot}
              />
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function firstName(name: string | null | undefined): string {
  return (name ?? 'Paciente').split(' ')[0]
}

function Pill({
  color,
  label,
  onClick,
}: {
  color: 'blue' | 'green' | 'gray'
  label: string
  onClick?: (e: React.MouseEvent) => void
}) {
  const styles = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-sand-200 text-stone-600',
  }[color]
  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight ${styles} ${
        onClick ? 'cursor-pointer hover:brightness-95' : ''
      }`}
    >
      {label}
    </span>
  )
}

function Overflow({ bucket }: { bucket: DayBucket | undefined }) {
  if (!bucket) return null
  const shown = Math.min(bucket.booked.length, 2) + Math.min(bucket.completed.length, 1) + Math.min(bucket.available.length, 1)
  const total = bucket.booked.length + bucket.completed.length + bucket.available.length
  const extra = total - shown
  if (extra <= 0) return null
  return <span className="px-1 text-[10px] font-medium text-stone-400">+{extra} más</span>
}

function Legend() {
  const item = (cls: string, text: string) => (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded ${cls}`} />
      {text}
    </span>
  )
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
      {item('bg-green-200', 'Disponible')}
      {item('bg-blue-200', 'Reservada')}
      {item('bg-sand-300', 'Completada')}
    </div>
  )
}

// --- Detalle del día seleccionado ---
function DayDetail({
  dateKey,
  bucket,
  onSelectAppt,
  onDeleteSlot,
}: {
  dateKey: string
  bucket: DayBucket | undefined
  onSelectAppt: (id: string) => void
  onDeleteSlot: (id: string) => void
}) {
  const empty =
    !bucket || (!bucket.available.length && !bucket.booked.length && !bucket.completed.length)
  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-stone-900">
        {formatDay(dateKey)}
      </h3>
      {empty ? (
        <p className="text-sm text-stone-500">
          Sin citas ni disponibilidad. Crea horarios arriba.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          {bucket!.booked.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAppt(a.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-left hover:bg-blue-100"
            >
              <span className="font-medium text-blue-900">{a.patient?.full_name}</span>
              <span className="text-xs text-blue-700">
                {a.slot && formatTime12(a.slot.start_time)}
              </span>
            </button>
          ))}
          {bucket!.completed.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAppt(a.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-sand-100 px-3 py-2 text-left hover:bg-sand-200"
            >
              <span className="font-medium text-stone-700">{a.patient?.full_name} ✓</span>
              <span className="text-xs text-stone-500">
                {a.slot && formatTime12(a.slot.start_time)}
              </span>
            </button>
          ))}
          {bucket!.available.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Disponibles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {bucket!.available.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full bg-green-50 py-1 pl-3 pr-1.5 text-xs font-medium text-green-800"
                  >
                    {formatTime12(s.start_time)}
                    <button
                      type="button"
                      onClick={() => onDeleteSlot(s.id)}
                      aria-label="Eliminar espacio"
                      className="flex h-4 w-4 items-center justify-center rounded-full text-green-700 hover:bg-green-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- Detalle del paciente + acciones ---
function PatientDetail({
  appt,
  onBack,
  onStart,
  onCancel,
  onComplete,
}: {
  appt: AppointmentWithPatient
  onBack: () => void
  onStart: () => void
  onCancel: () => void
  onComplete: (summary: string) => void
}) {
  const [completing, setCompleting] = useState(false)
  const [summary, setSummary] = useState(appt.summary ?? '')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const age = ageFromBirthDate(appt.patient?.birth_date ?? null)

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-4">
      <button type="button" onClick={onBack} className="mb-3 text-sm font-medium text-brand-700">
        ← Volver
      </button>

      <h3 className="font-semibold text-stone-900">{appt.patient?.full_name}</h3>
      <dl className="mt-2 space-y-1 text-sm text-stone-600">
        {age !== null && (
          <div className="flex gap-2">
            <dt className="text-stone-400">Edad:</dt>
            <dd>{age} años</dd>
          </div>
        )}
        {appt.patient?.phone && (
          <div className="flex gap-2">
            <dt className="text-stone-400">Teléfono:</dt>
            <dd>{appt.patient.phone}</dd>
          </div>
        )}
        {appt.slot && (
          <div className="flex gap-2">
            <dt className="text-stone-400">Hora:</dt>
            <dd>{formatTime12(appt.slot.start_time)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 rounded-lg bg-sand-50 p-3 text-sm">
        <p className="font-semibold text-stone-700">Motivo</p>
        <p className="text-stone-600">{appt.reason || 'No registrado.'}</p>
      </div>

      {appt.completed ? (
        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm">
          <p className="font-semibold text-green-800">Cita completada</p>
          <p className="text-stone-600">{appt.summary || 'Sin resumen.'}</p>
        </div>
      ) : completing ? (
        <div className="mt-4">
          <label htmlFor="summary" className="block text-sm font-medium text-stone-800">
            Resumen de la consulta
          </label>
          <textarea
            id="summary"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Qué encontraste y qué le recomendaste al paciente."
            className="mt-1.5 w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
          />
          <div className="mt-2 flex gap-2">
            <PrimaryButton
              type="button"
              onClick={() => onComplete(summary.trim())}
              disabled={!summary.trim()}
              className="flex-1"
            >
              Guardar
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setCompleting(false)}>
              Cancelar
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <PrimaryButton type="button" onClick={onStart} className="w-full">
            Iniciar consulta
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => setCompleting(true)}
            className="w-full"
          >
            Completar cita
          </SecondaryButton>
          <DangerButton type="button" onClick={() => setConfirmCancel(true)} className="w-full">
            Cancelar cita
          </DangerButton>
        </div>
      )}

      {confirmCancel && (
        <Modal title="Cancelar cita" onClose={() => setConfirmCancel(false)}>
          <p className="text-stone-600">
            ¿Cancelar la cita de {appt.patient?.full_name}? El horario quedará libre.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setConfirmCancel(false)}>
              No
            </SecondaryButton>
            <DangerButton
              type="button"
              onClick={() => {
                setConfirmCancel(false)
                onCancel()
              }}
            >
              Sí, cancelar
            </DangerButton>
          </div>
        </Modal>
      )}
    </div>
  )
}

// --- Formulario de disponibilidad (dos pestañas) ---
function AvailabilityForm({
  doctorId,
  date,
  onDateChange,
  onCreated,
}: {
  doctorId: string | undefined
  date: string
  onDateChange: (v: string) => void
  onCreated: () => void
}) {
  const toast = useToast()
  const times = halfHourOptions()
  const [tab, setTab] = useState<'specific' | 'recurring'>('specific')
  const [saving, setSaving] = useState(false)

  // Día específico (la fecha la controla el componente padre)
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('12:00')

  // Recurrente
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set())
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rStart, setRStart] = useState('08:00')
  const [rEnd, setREnd] = useState('12:00')

  function buildRows(d: string, s: string, e: string) {
    return halfHourStarts(s, e).map((t) => ({
      doctor_id: doctorId,
      date: d,
      start_time: `${t}:00`,
      end_time: `${addHalfHour(t)}:00`,
      specialty: DEFAULT_SPECIALTY,
      is_booked: false,
    }))
  }

  async function insertRows(rows: Record<string, unknown>[]) {
    if (!rows.length) {
      toast('No hay espacios para crear con esas horas.', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('availability_slots')
      .upsert(rows, { onConflict: 'doctor_id,date,start_time', ignoreDuplicates: true })
    setSaving(false)
    if (error) {
      toast('No se pudieron crear los espacios.', 'error')
      return
    }
    toast(`${rows.length} espacio(s) creados`, 'success')
    onCreated()
  }

  function createSpecific() {
    if (!date) return toast('Elige una fecha.', 'error')
    if (timeToMinutes(end) <= timeToMinutes(start))
      return toast('La hora de fin debe ser mayor que la de inicio.', 'error')
    insertRows(buildRows(date, start, end))
  }

  // Fechas del rango recurrente que caen en los días seleccionados.
  const recurringDates = useMemo(() => {
    if (!from || !to || weekdays.size === 0) return []
    const start = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T00:00:00')
    if (end < start) return []
    const maxEnd = new Date(start)
    maxEnd.setDate(start.getDate() + 28) // máx 4 semanas
    const dates: string[] = []
    const cursor = new Date(start)
    while (cursor <= end && cursor <= maxEnd) {
      if (weekdays.has(mondayFirstIndex(cursor))) dates.push(toDateKey(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return dates
  }, [from, to, weekdays])

  const slotsPerDay =
    timeToMinutes(rEnd) > timeToMinutes(rStart)
      ? halfHourStarts(rStart, rEnd).length
      : 0
  const previewCount = recurringDates.length * slotsPerDay

  function createRecurring() {
    if (weekdays.size === 0) return toast('Elige al menos un día.', 'error')
    if (!from || !to) return toast('Elige el rango de fechas.', 'error')
    if (timeToMinutes(rEnd) <= timeToMinutes(rStart))
      return toast('La hora de fin debe ser mayor que la de inicio.', 'error')
    const rows = recurringDates.flatMap((d) => buildRows(d, rStart, rEnd))
    insertRows(rows)
  }

  const timeSelect = (
    value: string,
    onChange: (v: string) => void,
    id: string,
  ) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-sand-300 bg-white px-2 py-2 text-sm focus:border-brand-600 focus:outline-none"
    >
      {times.map((t) => (
        <option key={t} value={t}>
          {formatTime12(t)}
        </option>
      ))}
    </select>
  )

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-stone-900">Crear disponibilidad</h3>

      <div className="mb-4 flex rounded-full bg-sand-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab('specific')}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors ${
            tab === 'specific' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
          }`}
        >
          Día específico
        </button>
        <button
          type="button"
          onClick={() => setTab('recurring')}
          className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors ${
            tab === 'recurring' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
          }`}
        >
          Recurrente
        </button>
      </div>

      {tab === 'specific' ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="sp-date" className="block text-xs font-medium text-stone-600">
              Fecha
            </label>
            <input
              id="sp-date"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="sp-start" className="block text-xs font-medium text-stone-600">
                Desde
              </label>
              {timeSelect(start, setStart, 'sp-start')}
            </div>
            <div>
              <label htmlFor="sp-end" className="block text-xs font-medium text-stone-600">
                Hasta
              </label>
              {timeSelect(end, setEnd, 'sp-end')}
            </div>
          </div>
          <PrimaryButton type="button" onClick={createSpecific} disabled={saving} className="w-full">
            + Crear disponibilidad
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="block text-xs font-medium text-stone-600">Días</span>
            <div className="mt-1 flex gap-1">
              {WEEKDAY_LABELS.map((lbl, i) => {
                const on = weekdays.has(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setWeekdays((prev) => {
                        const next = new Set(prev)
                        if (next.has(i)) next.delete(i)
                        else next.add(i)
                        return next
                      })
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      on ? 'bg-brand-600 text-white' : 'bg-sand-100 text-stone-600'
                    }`}
                  >
                    {lbl}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="r-from" className="block text-xs font-medium text-stone-600">
                Desde
              </label>
              <input
                id="r-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sand-300 bg-white px-2 py-2 text-sm focus:border-brand-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="r-to" className="block text-xs font-medium text-stone-600">
                Hasta
              </label>
              <input
                id="r-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sand-300 bg-white px-2 py-2 text-sm focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="r-start" className="block text-xs font-medium text-stone-600">
                Hora inicio
              </label>
              {timeSelect(rStart, setRStart, 'r-start')}
            </div>
            <div>
              <label htmlFor="r-end" className="block text-xs font-medium text-stone-600">
                Hora fin
              </label>
              {timeSelect(rEnd, setREnd, 'r-end')}
            </div>
          </div>
          <p className="text-xs text-stone-500">
            Se crearán <span className="font-semibold text-stone-800">{previewCount}</span>{' '}
            espacios. Máximo 4 semanas.
          </p>
          <PrimaryButton
            type="button"
            onClick={createRecurring}
            disabled={saving || previewCount === 0}
            className="w-full"
          >
            + Crear espacios
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}

function formatDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const s = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
