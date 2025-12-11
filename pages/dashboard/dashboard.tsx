import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

const Dashboard = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // 1. বর্তমান session check
    const session = supabase.auth.session()
    if (!session) {
      router.push('/auth/login') // Logged out → redirect to login
    } else {
      setUser(session.user)
    }

    setLoading(false)

    // 2. OnAuthStateChange listener
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/auth/login')
      else setUser(session.user)
    })

    // Cleanup listener on unmount
    return () => {
      listener?.unsubscribe()
    }
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ maxWidth: 600, margin: 'auto', paddingTop: 50 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.email}</p>
    </div>
  )
}

export default Dashboard
