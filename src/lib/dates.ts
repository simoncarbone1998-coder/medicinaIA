// Utilidades de fecha/hora en español (Colombia, sin horario de verano).
// Las fechas de la BD vienen como 'YYYY-MM-DD' y las horas como 'HH:MM:SS'.

// Convierte 'YYYY-MM-DD' (+ hora opcional) a un Date en hora LOCAL, evitando el
// corrimiento de zona que produce new Date('YYYY-MM-DD') (que asume UTC).
export function parseLocal(dateStr: string, timeStr = '00:00:00'): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh = 0, mm = 0, ss = 0] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, ss)
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "Martes 22 de abril"
export function formatSpanishDate(dateStr: string): string {
  const d = parseLocal(dateStr)
  const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(d)
  const month = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(d)
  return `${cap(weekday)} ${d.getDate()} de ${month}`
}

// "10:00 AM" (a partir de 'HH:MM:SS' o 'HH:MM')
export function formatTime12(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// "Martes 22 de abril · 10:00 AM"
export function formatLongDateTime(dateStr: string, timeStr: string): string {
  return `${formatSpanishDate(dateStr)} · ${formatTime12(timeStr)}`
}

// ¿Se puede entrar a la consulta? Desde 5 min antes del inicio hasta el fin.
export function canJoinNow(
  dateStr: string,
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): boolean {
  const start = parseLocal(dateStr, startTime).getTime()
  const end = parseLocal(dateStr, endTime).getTime()
  const t = now.getTime()
  return t >= start - 5 * 60 * 1000 && t <= end
}

// Edad en años a partir de 'YYYY-MM-DD'.
export function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null
  const b = parseLocal(birthDate)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  if (beforeBirthday) age--
  return age >= 0 && age < 130 ? age : null
}

// 'YYYY-MM-DD' local de un Date.
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Etiquetas cortas de día (lunes-primero) para los chips de recurrencia.
export const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
export const WEEKDAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

// getDay() de JS es 0=domingo..6=sábado. Lo pasamos a 0=lunes..6=domingo.
export function mondayFirstIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

// Nombre del mes + año: "Abril 2026"
export function monthLabel(year: number, month: number): string {
  const d = new Date(year, month, 1)
  return cap(
    new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(d),
  )
}

// Matriz de semanas (lunes-primero) que cubre el mes; incluye días de relleno
// de los meses vecinos para completar la cuadrícula.
export function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - mondayFirstIndex(first))

  const weeks: Date[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    // Detener si ya pasamos el mes y completamos la semana.
    if (cursor.getMonth() !== month && cursor > new Date(year, month + 1, 1)) break
  }
  return weeks
}

// Opciones de hora en saltos de 30 min ('HH:MM') entre 06:00 y 21:00.
export function halfHourOptions(): string[] {
  const out: string[] = []
  for (let h = 6; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 21) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
}

// Suma 30 minutos a 'HH:MM' (o 'HH:MM:SS'); devuelve 'HH:MM'.
export function addHalfHour(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + 30
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

// Compara 'HH:MM(:SS)' como minutos del día.
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}
