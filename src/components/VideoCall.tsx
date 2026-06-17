import { useEffect, useRef, useState } from 'react'
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'

// Crea un nuevo objeto de llamada, destruyendo cualquier instancia previa (evita
// el error de "Duplicate DailyIframe instances", p. ej. con StrictMode en dev).
function freshCallObject(): DailyCall {
  const existing = DailyIframe.getCallInstance()
  if (existing) {
    try {
      existing.destroy()
    } catch {
      /* ignore */
    }
  }
  return DailyIframe.createCallObject()
}

// UI de videollamada simple: video remoto grande + video local en una esquina.
// Sin transcripción ni notas. El médico escribe el resumen aparte.
export default function VideoCall({
  roomUrl,
  token,
  onLeave,
  leaveLabel,
}: {
  roomUrl: string
  token: string
  onLeave: () => void
  leaveLabel: string
}) {
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const callRef = useRef<DailyCall | null>(null)
  const [status, setStatus] = useState<'joining' | 'joined' | 'error'>('joining')
  const [remotePresent, setRemotePresent] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  useEffect(() => {
    const call = freshCallObject()
    callRef.current = call

    const updateLocal = () => {
      const track = call.participants().local?.tracks?.video?.persistentTrack
      if (localRef.current) {
        localRef.current.srcObject = track ? new MediaStream([track]) : null
      }
    }
    const updateRemote = () => {
      const remote = Object.values(call.participants()).find((p) => !p.local)
      if (!remote) {
        setRemotePresent(false)
        if (remoteRef.current) remoteRef.current.srcObject = null
        return
      }
      setRemotePresent(true)
      const tracks: MediaStreamTrack[] = []
      const v = remote.tracks?.video?.persistentTrack
      const a = remote.tracks?.audio?.persistentTrack
      if (v) tracks.push(v)
      if (a) tracks.push(a)
      if (remoteRef.current) {
        remoteRef.current.srcObject = tracks.length ? new MediaStream(tracks) : null
      }
    }
    const refresh = () => {
      updateLocal()
      updateRemote()
    }

    call
      .on('joined-meeting', () => {
        setStatus('joined')
        refresh()
      })
      .on('participant-joined', updateRemote)
      .on('participant-updated', refresh)
      .on('participant-left', updateRemote)
      .on('track-started', refresh)
      .on('track-stopped', refresh)
      .on('error', () => setStatus('error'))

    call.join({ url: roomUrl, token }).catch(() => setStatus('error'))

    return () => {
      call.destroy()
    }
  }, [roomUrl, token])

  async function leave() {
    try {
      await callRef.current?.leave()
    } catch {
      /* ignore */
    }
    onLeave()
  }

  function toggleMic() {
    const next = !micOn
    setMicOn(next)
    callRef.current?.setLocalAudio(next)
  }
  function toggleCam() {
    const next = !camOn
    setCamOn(next)
    callRef.current?.setLocalVideo(next)
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-stone-900">
      {/* Video remoto (grande) */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {/* Estados de conexión / espera */}
      {(status !== 'joined' || !remotePresent) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
          {status === 'error' ? (
            <>
              <p className="text-lg font-semibold">No se pudo conectar</p>
              <p className="text-sm text-white/70">
                Revisa tu conexión e inténtalo de nuevo.
              </p>
            </>
          ) : status === 'joining' ? (
            <p className="text-white/80">Conectando…</p>
          ) : (
            <p className="text-white/80">
              Esperando a que la otra persona se una…
            </p>
          )}
        </div>
      )}

      {/* Video local (esquina) */}
      <video
        ref={localRef}
        autoPlay
        playsInline
        muted
        className="absolute right-3 top-3 aspect-[3/4] w-28 -scale-x-100 rounded-2xl border-2 border-white/20 bg-stone-800 object-cover shadow-lg sm:w-40"
      />

      {/* Controles */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-5 pb-7">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${
            micOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {micOn ? '🎤' : '🔇'}
        </button>
        <button
          type="button"
          onClick={toggleCam}
          aria-label={camOn ? 'Apagar cámara' : 'Encender cámara'}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${
            camOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {camOn ? '📹' : '🚫'}
        </button>
        <button
          type="button"
          onClick={leave}
          className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          {leaveLabel}
        </button>
      </div>
    </div>
  )
}
