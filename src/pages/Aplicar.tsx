import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useProfile } from '../lib/useProfile'
import {
  homePathForProfile,
  isValidEmail,
  MIN_PASSWORD,
  signUpWithProfile,
} from '../lib/auth'
import { useToast } from '../components/Toast'
import {
  AuthShell,
  Field,
  FormError,
  FullScreenLoader,
  SubmitButton,
} from '../components/ui'

export default function Aplicar() {
  const navigate = useNavigate()
  const toast = useToast()
  const { session, profile, loading } = useProfile()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    delivery_address: '',
    password: '',
    confirm_password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (loading) return <FullScreenLoader />

  if (session && profile) {
    return <Navigate to={homePathForProfile(profile)} replace />
  }

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const full_name = form.full_name.trim()
    const email = form.email.trim()
    const phone = form.phone.trim()
    const city = form.city.trim()
    const delivery_address = form.delivery_address.trim()

    if (!full_name || !email || !phone || !city || !delivery_address) {
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
      city,
      delivery_address,
      role: 'patient',
    })
    setSubmitting(false)

    if (error) {
      setErrorMsg(error)
      toast(error, 'error')
      return
    }

    toast('¡Cuenta creada!', 'success')
    navigate('/paciente/mi-salud', { replace: true })
  }

  return (
    <AuthShell
      title="Crear cuenta de paciente"
      subtitle="Unos datos para poder atenderte y, si lo necesitas, enviarte tu medicación."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-700 underline">
            Inicia sesión
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
        <Field
          id="city"
          label="Ciudad"
          autoComplete="address-level2"
          required
          value={form.city}
          onChange={update('city')}
        />
        <Field
          id="delivery_address"
          label="Dirección de entrega"
          autoComplete="street-address"
          required
          value={form.delivery_address}
          onChange={update('delivery_address')}
          placeholder="Para enviarte tu medicación si la necesitas"
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
        <SubmitButton loading={submitting}>Crear cuenta</SubmitButton>
        <p className="text-xs leading-relaxed text-stone-500">
          Al crear tu cuenta, aceptas el tratamiento de tus datos de salud según
          nuestra política de privacidad (Ley 1581 / Habeas Data).
        </p>
      </form>
    </AuthShell>
  )
}
