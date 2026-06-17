import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCallCredentials } from '../lib/daily'
import VideoCall from './VideoCall'

type PrepResult =
  | { kind: 'ready'; creds: { roomUrl: string; token: string } }
  | { kind: 'notfound' }
  | { kind: 'error'; msg: string }

// Verifica acceso a la cita (RLS) y obtiene las credenciales de Daily. Sin
// setState: devuelve un resultado que el efecto aplica en un callback.
async function prepareConsulta(appointmentId: string): Promise<PrepResult> {
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return { kind: 'notfound' }

  try {
    const creds = await getCallCredentials(appointmentId)
    return { kind: 'ready', creds }
  } catch (err) {
    return {
      kind: 'error',
      msg: err instanceof Error ? err.message : 'No se pudo iniciar la consulta.',
    }
  }
}

// Pantalla de videoconsulta compartida por paciente y médico. El acceso ya está
// restringido por RLS (solo el paciente o el médico de la cita pueden leerla) y
// la edge function vuelve a verificarlo antes de emitir el token.
export default function ConsultaScreen({
  backTo,
  leaveLabel,
}: {
  backTo: string
  leaveLabel: string
}) {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>(
    'loading',
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [creds, setCreds] = useState<{ roomUrl: string; token: string } | null>(null)

  useEffect(() => {
    if (!appointmentId) return
    let mounted = true
    prepareConsulta(appointmentId).then((result) => {
      if (!mounted) return
      if (result.kind === 'ready') {
        setCreds(result.creds)
        setState('ready')
      } else if (result.kind === 'error') {
        setErrorMsg(result.msg)
        setState('error')
      } else {
        setState('notfound')
      }
    })
    return () => {
      mounted = false
    }
  }, [appointmentId])

  // El parámetro de ruta siempre existe; defensivamente, si falta, no encontrada.
  if (!appointmentId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center">
        <p className="text-lg font-semibold text-white">No encontramos esta consulta</p>
        <Link to={backTo} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-900">
          Volver
        </Link>
      </main>
    )
  }

  if (state === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-900 px-5">
        <p className="text-white/80">Preparando tu consulta…</p>
      </main>
    )
  }

  if (state === 'notfound' || state === 'error') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center">
        <p className="text-lg font-semibold text-white">
          {state === 'notfound'
            ? 'No encontramos esta consulta'
            : 'No se pudo iniciar la consulta'}
        </p>
        {errorMsg && <p className="max-w-sm text-sm text-white/70">{errorMsg}</p>}
        <Link
          to={backTo}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-900"
        >
          Volver
        </Link>
      </main>
    )
  }

  return (
    <VideoCall
      roomUrl={creds!.roomUrl}
      token={creds!.token}
      leaveLabel={leaveLabel}
      onLeave={() => navigate(backTo, { replace: true })}
    />
  )
}
