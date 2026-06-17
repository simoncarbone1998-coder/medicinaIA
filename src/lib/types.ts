// Tipos compartidos del dominio de Contigo. Reflejan la tabla `profiles`.

export type Role = 'patient' | 'doctor' | 'admin'
export type DoctorStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: Role | null
  phone: string | null
  city: string | null
  birth_date: string | null
  avatar_url: string | null
  delivery_address: string | null
  specialty: string | null
  medical_license: string | null
  undergraduate_university: string | null
  doctor_status: DoctorStatus | null
  onboarding_completed: boolean
  created_at: string
}

export type AppointmentStatus = 'confirmed' | 'cancelled'

export interface AvailabilitySlot {
  id: string
  doctor_id: string
  date: string
  start_time: string
  end_time: string
  is_booked: boolean
  specialty: string | null
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  slot_id: string | null
  status: AppointmentStatus
  reason: string | null
  summary: string | null
  completed: boolean
  completed_at: string | null
  daily_room_name: string | null
  daily_room_url: string | null
  created_at: string
}

// Cita con el slot y el perfil de la contraparte embebidos (vía joins de PostgREST).
export interface AppointmentWithDoctor extends Appointment {
  slot: Pick<AvailabilitySlot, 'date' | 'start_time' | 'end_time'> | null
  doctor: Pick<Profile, 'full_name' | 'specialty'> | null
}

export interface AppointmentWithPatient extends Appointment {
  slot: Pick<AvailabilitySlot, 'date' | 'start_time' | 'end_time'> | null
  patient: Pick<Profile, 'full_name' | 'phone' | 'birth_date'> | null
}

// Especialidad por defecto del MVP (medicina general).
export const DEFAULT_SPECIALTY = 'Medicina General'

// Especialidades disponibles para el registro de médicos.
export const SPECIALTIES = [
  'Medicina General',
  'Pediatría',
  'Ginecología',
  'Cardiología',
  'Dermatología',
  'Psicología',
  'Ortopedia',
] as const
