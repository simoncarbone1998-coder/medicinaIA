import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useProfile } from '../lib/useProfile'
import {
  homePathForProfile,
  isValidEmail,
  MIN_PASSWORD,
  signUpWithProfile,
} from '../lib/auth'
import { SPECIALTIES } from '../lib/types'
import { useToast } from '../components/Toast'
import {
  AuthShell,
  Field,
  FormError,
  FullScreenLoader,
  SelectField,
  SubmitButton,
} from '../components/ui'

export default function Registro() {
  const [searchParams] = useSearchParams()
  const { session, profile, loading } = useProfile()

  if (loading) return <FullScreenLoader />

  // Ya hay sesión: no tiene sentido registrarse de nuevo.
  if (session && profile) {
    return <Navigate to={homePathForProfile(profile)} replace />
  }

  // ?role=doctor muestra el formulario de médico; si no, las dos tarjetas.
  if (searchParams.get('role') === 'doctor') {
    return <DoctorRegister />
  }
  return <RoleChooser />
}

// --- Paso 1: elegir tipo de cuenta ---------------------------------------
function RoleChooser() {
  const cardClasses =
    'flex items-center justify-between gap-4 rounded-2xl border border-sand-200 bg-white p-5 text-left transition-shadow hover:shadow-md hover:shadow-brand-900/5'

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="¿Cómo quieres usar Contigo?"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-700 underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <Link to="/aplicar" className={cardClasses}>
          <span>
            <span className="block font-semibold text-stone-900">Soy paciente</span>
            <span className="mt-0.5 block text-sm text-stone-600">
              Quiero atención médica desde mi teléfono.
            </span>
          </span>
          <span aria-hidden="true" className="text-brand-600">
            →
          </span>
        </Link>

        <Link to="/registro?role=doctor" className={cardClasses}>
          <span>
            <span className="block font-semibold text-stone-900">Soy médico</span>
            <span className="mt-0.5 block text-sm text-stone-600">
              Quiero atender pacientes en Contigo.
            </span>
          </span>
          <span aria-hidden="true" className="text-brand-600">
            →
          </span>
        </Link>
      </div>
    </AuthShell>
  )
}

// --- Registro de médico ---------------------------------------------------
function DoctorRegister() {
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialty: '',
    undergraduate_university: '',
    medical_license: '',
    password: '',
    confirm_password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const full_name = form.full_name.trim()
    const email = form.email.trim()
    const phone = form.phone.trim()
    const undergraduate_university = form.undergraduate_university.trim()
    const medical_license = form.medical_license.trim()

    if (
      !full_name ||
      !email ||
      !phone ||
      !form.specialty ||
      !undergraduate_university ||
      !medical_license
    ) {
      setErrorMsg('Completa todos los campos.')
      return
    }
    if (!isValidEmail(email)) {
      setErrorMsg('Ese correo no es válido.')
      return
    }
    if (form.password.length < MIN_PASSWORD) {
      setErrorMsg(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (form.password !== form.confirm_password) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    const { error } = await signUpWithProfile(email, form.password, {
      full_name,
      phone,
      specialty: form.specialty,
      undergraduate_university,
      medical_license,
      role: 'doctor',
      doctor_status: 'pending',
    })
    setSubmitting(false)

    if (error) {
      setErrorMsg(error)
      toast(error, 'error')
      return
    }

    toast('Cuenta de médico creada', 'success')
    navigate('/doctor/pending', { replace: true })
  }

  return (
    <AuthShell
      title="Registro de médico"
      subtitle="Verificamos las credenciales de cada médico antes de activar la cuenta."
      footer={
        <>
          ¿Eres paciente?{' '}
          <Link to="/aplicar" className="font-semibold text-brand-700 underline">
            Crea tu cuenta aquí
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          id="full_name"
          label="Nombre completo"
          autoComplete="name"
          required
          value={form.full_name}
          onChange={update('full_name')}
        />
        <Field
          id="email"
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update('email')}
          placeholder="tucorreo@ejemplo.com"
        />
        <Field
          id="phone"
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={form.phone}
          onChange={update('phone')}
        />
        <SelectField
          id="specialty"
          label="Especialidad"
          required
          value={form.specialty}
          onChange={update('specialty')}
        >
          <option value="" disabled>
            Selecciona tu especialidad
          </option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <Field
          id="undergraduate_university"
          label="Universidad de pregrado"
          required
          value={form.undergraduate_university}
          onChange={update('undergraduate_university')}
        />
        <Field
          id="medical_license"
          label="Tarjeta profesional (registro médico)"
          required
          value={form.medical_license}
          onChange={update('medical_license')}
        />
        <Field
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
          placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
        />
        <Field
          id="confirm_password"
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm_password}
          onChange={update('confirm_password')}
        />
        <FormError message={errorMsg} />
        <SubmitButton loading={submitting}>Crear cuenta de médico</SubmitButton>
      </form>
    </AuthShell>
  )
}
