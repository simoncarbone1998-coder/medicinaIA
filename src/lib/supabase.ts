import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Define VITE_SUPABASE_URL y ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.',
  )
}

// Cliente único de Supabase para toda la app (base de datos + autenticación).
// La clave publishable es segura para el navegador; nunca uses aquí la service key.
export const supabase = createClient(supabaseUrl, supabasePublishableKey)
