// daily-proxy: crea salas y tokens de Daily.co para las videoconsultas.
//
// Se despliega con --no-verify-jwt, así que verificamos al usuario manualmente:
// leemos su token del header Authorization, confirmamos que es paciente o médico
// de la cita, y solo entonces creamos la sala/token. La DAILY_API_KEY nunca sale
// del servidor.
//
// Acciones:
//   { action: 'create-room',  appointmentId } -> { roomName, roomUrl }
//   { action: 'create-token', appointmentId } -> { token }
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
// DAILY_API_KEY debe configurarse como secreto (ver README de despliegue).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DAILY_API = 'https://api.daily.co/v1'
const ROOM_TTL_SECONDS = 2 * 60 * 60 // 2 horas

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json(401, { error: 'No autorizado.' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const dailyKey = Deno.env.get('DAILY_API_KEY')
    if (!dailyKey) {
      return json(500, {
        error: 'Falta configurar DAILY_API_KEY en el servidor.',
      })
    }

    // Cliente con permisos de servicio (omite RLS para leer/escribir la cita).
    const admin = createClient(supabaseUrl, serviceKey)

    // Validar el token del usuario y obtener su id.
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) return json(401, { error: 'No autorizado.' })
    const userId = userData.user.id

    const { action, appointmentId } = await req.json()
    if (!appointmentId) return json(400, { error: 'Falta el id de la cita.' })

    // Cargar la cita y confirmar que el usuario participa en ella.
    const { data: appt, error: apptErr } = await admin
      .from('appointments')
      .select('id, patient_id, doctor_id, status, daily_room_name, daily_room_url')
      .eq('id', appointmentId)
      .maybeSingle()

    if (apptErr || !appt) return json(404, { error: 'No encontramos la cita.' })

    const isDoctor = appt.doctor_id === userId
    const isPatient = appt.patient_id === userId
    if (!isDoctor && !isPatient) {
      return json(403, { error: 'No tienes acceso a esta consulta.' })
    }
    if (appt.status !== 'confirmed') {
      return json(400, { error: 'Esta cita no está activa.' })
    }

    if (action === 'create-room') {
      let roomName = appt.daily_room_name as string | null
      let roomUrl = appt.daily_room_url as string | null

      // Reutiliza la sala si ya existe.
      if (!roomName || !roomUrl) {
        const exp = Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS
        const res = await fetch(`${DAILY_API}/rooms`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${dailyKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            privacy: 'private',
            properties: {
              exp,
              max_participants: 2,
              enable_prejoin_ui: false,
            },
          }),
        })
        const room = await res.json()
        if (!res.ok) {
          return json(502, { error: 'No se pudo crear la sala.', detail: room })
        }
        roomName = room.name
        roomUrl = room.url
        await admin
          .from('appointments')
          .update({ daily_room_name: roomName, daily_room_url: roomUrl })
          .eq('id', appointmentId)
      }

      return json(200, { roomName, roomUrl })
    }

    if (action === 'create-token') {
      // Asegura que la sala exista antes de emitir el token.
      const roomName = appt.daily_room_name as string | null
      if (!roomName) {
        return json(400, { error: 'La sala aún no existe. Crea la sala primero.' })
      }
      const exp = Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS
      const res = await fetch(`${DAILY_API}/meeting-tokens`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dailyKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            is_owner: isDoctor, // el médico es el "dueño" de la sala
            exp,
          },
        }),
      })
      const tokenRes = await res.json()
      if (!res.ok) {
        return json(502, { error: 'No se pudo crear el token.', detail: tokenRes })
      }
      return json(200, { token: tokenRes.token })
    }

    return json(400, { error: 'Acción no válida.' })
  } catch (err) {
    return json(500, { error: 'Error inesperado.', detail: String(err) })
  }
})
