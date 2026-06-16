import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './useSession'
import type { Profile } from './types'

// Sesión + perfil del usuario actual en un solo hook. La mayoría de las páginas
// necesitan saber el rol (paciente / médico / admin) para decidir qué mostrar,
// así que cargamos el perfil junto con la sesión.
//
// Guardamos el perfil junto al id al que pertenece y derivamos `loading`, en vez
// de llamar a setState de forma síncrona dentro del efecto (lo cual provoca
// renders en cascada).
export function useProfile() {
  const { session, loading: sessionLoading } = useSession()
  const userId = session?.user.id

  const [entry, setEntry] = useState<{
    id: string | undefined
    profile: Profile | null
  }>({ id: undefined, profile: null })

  useEffect(() => {
    // Sin sesión (o aún cargándola): nada que pedir.
    if (sessionLoading || !userId) return

    let mounted = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) setEntry({ id: userId, profile: (data as Profile | null) ?? null })
      })

    return () => {
      mounted = false
    }
  }, [userId, sessionLoading])

  // Hay perfil válido solo cuando lo que cargamos corresponde al usuario actual.
  const resolvedForCurrentUser = entry.id === userId
  const loading = sessionLoading || (!!userId && !resolvedForCurrentUser)
  const profile = userId && resolvedForCurrentUser ? entry.profile : null

  return { session, profile, loading }
}
