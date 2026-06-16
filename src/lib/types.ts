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
