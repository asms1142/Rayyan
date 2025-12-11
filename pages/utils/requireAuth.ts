import { supabase } from "../lib/supabaseClient"

export async function requireAuth(context) {
  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      }
    }
  }

  return { props: {} }
}
