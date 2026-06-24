import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Ph_seal_alaminos_laguna.png/120px-Ph_seal_alaminos_laguna.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Invalid email or password.')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src={LOGO} alt="Alaminos seal" onError={(e) => { e.target.style.display = 'none' }} />
        <h1>Admin Sign In</h1>
        <p className="sub">Municipality of Alaminos GSO — Purchase Request &amp; Inventory Management System</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer-note">Authorized personnel only · All access is logged</p>
      </div>
    </div>
  )
}
