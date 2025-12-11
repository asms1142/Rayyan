import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'

const Signup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignup = async () => {
    setLoading(true)
    setMessage('')
    const { user, session, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) setMessage(error.message)
    else setMessage('Signup successful! Check your email for confirmation.')
    
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto', paddingTop: 50 }}>
      <h2>Signup</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />
      <button onClick={handleSignup} disabled={loading} style={{ width: '100%', padding: 8 }}>
        {loading ? 'Signing up...' : 'Signup'}
      </button>
      {message && <p>{message}</p>}
      <p>
        Already have an account? <a href="/auth/login">Login</a>
      </p>
    </div>
  )
}

export default Signup
