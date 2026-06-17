import { supabase } from './supabase'

// Pide a la edge function la sala y el token de Daily para una cita. La función
// verifica que quien llama sea el paciente o el médico de esa cita.
export async function getCallCredentials(
  appointmentId: string,
): Promise<{ roomUrl: string; token: string }> {
  const room = await supabase.functions.invoke('daily-proxy', {
    body: { action: 'create-room', appointmentId },
  })
  if (room.error || !room.data?.roomUrl) {
    throw new Error(room.data?.error ?? 'No se pudo preparar la videollamada.')
  }

  const tok = await supabase.functions.invoke('daily-proxy', {
    body: { action: 'create-token', appointmentId },
  })
  if (tok.error || !tok.data?.token) {
    throw new Error(tok.data?.error ?? 'No se pudo preparar la videollamada.')
  }

  return { roomUrl: room.data.roomUrl as string, token: tok.data.token as string }
}
