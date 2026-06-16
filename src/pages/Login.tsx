import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../lib/useProfile'
import { homePathForProfile, mapAuthError } from '../lib/auth'
import type { Profile } from '../lib/types'
import { useToast } from '../components/Toast'
import { AuthShell, Field, FormError, FullScreenLoader, SubmitButton } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const { session, profile, loading } = useProfile()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (loading) return <FullScreenLoader />

  // Ya hay sesión: a su espacio según el rol.
  if (session && profile) {
    return <Navigate to={homePathForProfile(profile)} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const correo = email.trim()
    if (!correo || !password) {
      setErrorMsg('Escribe tu correo y tu contraseña.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    })

    if (error) {
      setSubmitting(false)
      const msg = mapAuthError(error)
      setErrorMsg(msg)
      toast(msg, 'error')
      return
    }

    // Sesión iniciada: leemos el rol para saber a dónde llevarlo.
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    toast('Sesión iniciada', 'success')
    navigate(homePathForProfile((p as Profile | null) ?? null), { replace: true })
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Entra con tu correo y tu contraseña."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-brand-700 underline">
            Crea una
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          id="email"
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />
        <Field
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tu contraseña"
        />
        <FormError message={errorMsg} />
        <SubmitButton loading={submitting}>Iniciar sesión</SubmitButton>
      </form>
    </AuthShell>
  )
}
