import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faTriangleExclamation, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import LOGO from '../assets/alaminos-seal.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // MFA step 2
  const [step, setStep] = useState('credentials') // 'credentials' | 'mfa'
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState(null)
  const [mfaChallengeId, setMfaChallengeId] = useState(null)
  const [mfaError, setMfaError] = useState('')
  const [mfaVerifying, setMfaVerifying] = useState(false)

  const { signIn, sessionExpired } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: signInErr } = await signIn(email, password)
    if (signInErr) {
      setLoading(false)
      setError('Invalid email or password.')
      return
    }

    // Check if MFA challenge is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (totp) {
        const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totp.id })
        setMfaFactorId(totp.id)
        setMfaChallengeId(challenge.id)
        setLoading(false)
        setStep('mfa')
        return
      }
    }

    setLoading(false)
    navigate('/admin/dashboard')
  }

  async function handleMfaVerify(e) {
    e.preventDefault()
    if (!mfaCode.trim()) { setMfaError('Enter your 6-digit code.'); return }
    setMfaVerifying(true)
    setMfaError('')
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode.trim(),
    })
    setMfaVerifying(false)
    if (verifyErr) { setMfaError('Incorrect code. Try again.'); return }
    navigate('/admin/dashboard')
  }

  function handleKeyEvent(e) {
    setCapsLock(e.getModifierState('CapsLock'))
  }

  // ── MFA Step 2 screen ──
  if (step === 'mfa') {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(122,30,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: 26, color: 'var(--maroon)' }} />
          </div>
          <h1 style={{ fontSize: 20 }}>Two-Factor Authentication</h1>
          <p className="sub">Open your authenticator app and enter the 6-digit code.</p>

          {mfaError && <div className="alert alert-error">{mfaError}</div>}

          <form onSubmit={handleMfaVerify}>
            <div className="form-group">
              <label className="form-label">Authentication Code</label>
              <input
                className="form-input"
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                inputMode="numeric"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={mfaVerifying}>
              {mfaVerifying ? 'Verifying…' : 'Verify'}
            </button>
          </form>

          <button
            onClick={() => { setStep('credentials'); setMfaCode(''); setMfaError('') }}
            style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back to login
          </button>
        </div>
      </div>
    )
  }

  // ── Step 1: Credentials ──
  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src={LOGO} alt="Alaminos seal" onError={(e) => { e.target.style.display = 'none' }} />
        <h1>Admin Sign In</h1>
        <p className="sub">Municipality of Alaminos GSO — Purchase Request &amp; Inventory Management System</p>

        {sessionExpired && !error && (
          <div className="alert alert-error">Your session has expired. Please sign in again.</div>
        )}
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: 42 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyEvent}
                onKeyUp={handleKeyEvent}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4, lineHeight: 1,
                }}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {capsLock && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#b45309' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                Caps Lock is on
              </div>
            )}
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
