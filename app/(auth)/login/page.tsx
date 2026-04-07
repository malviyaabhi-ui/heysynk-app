'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const FEATURES = [
  'Unified inbox for all support channels',
  'Mira AI — replies, writes KB, resolves 68%',
  'Knowledge base with sticky widgets',
  'Campaigns, analytics & integrations',
  'Real-time notifications & live visitors',
]

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [step, setStep] = useState<'workspace' | 'auth' | 'otp'>('workspace')
  const [workspace, setWorkspace] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function switchMode(m: 'signin' | 'signup') {
    setMode(m); setStep('workspace'); setError('')
    setEmail(''); setPassword(''); setConfirmPassword(''); setFullName(''); setOtp('')
  }

  async function handleContinue() {
    if (!workspace.trim()) { setError('Please enter your workspace URL'); return }
    setError(''); setStep('auth')
  }

  async function handleAuth() {
    setError(''); setLoading(true)
    try {
      if (mode === 'signup') {
        if (!fullName.trim()) { setError('Please enter your full name'); setLoading(false); return }
        if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }
        if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return }
        const { error: e } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, workspace_slug: workspace } } })
        if (e) { setError(e.message); setLoading(false); return }
        router.push(`/${workspace}/inbox`)
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) { setError(e.message); setLoading(false); return }
        router.push(`/${workspace}/inbox`)
      }
    } catch (e: any) { setError(e.message || 'Something went wrong') }
    setLoading(false)
  }

  async function handleOtp() {
    setError(''); setLoading(true)
    try {
      const { error: e } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
      if (e) { setError(e.message); setLoading(false); return }
      router.push(`/${workspace}/inbox`)
    } catch (e: any) { setError(e.message || 'Something went wrong') }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 14,
    fontFamily: 'inherit', background: '#fff', color: '#0F172A',
    boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
    background: active ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#E2E8F0',
    color: active ? '#fff' : '#94A3B8',
    fontSize: 15, fontWeight: 700,
    cursor: active ? 'pointer' : 'not-allowed',
    transition: 'transform 0.15s, box-shadow 0.15s',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-8px) } }
        @keyframes pulseGlow { 0%,100% { box-shadow:0 0 32px rgba(37,99,235,0.4) } 50% { box-shadow:0 0 56px rgba(37,99,235,0.7),0 0 80px rgba(124,58,237,0.3) } }
        @keyframes slideIn { from { opacity:0; transform:translateX(24px) } to { opacity:1; transform:translateX(0) } }
        @keyframes checkIn { from { opacity:0; transform:translateX(-10px) } to { opacity:1; transform:translateX(0) } }
        .hs-input:focus { border-color:#2563EB !important; box-shadow:0 0 0 3px rgba(37,99,235,0.12) !important; outline:none }
        .hs-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(37,99,235,0.3) }
        .hs-btn:active:not(:disabled) { transform:translateY(0) }
      `}</style>

      {/* LEFT PANEL */}
      <div style={{ width: '42%', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'float 3s ease-in-out infinite, pulseGlow 3s ease-in-out infinite' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 12, textAlign: 'center', letterSpacing: '-0.5px', animation: 'fadeUp 0.6s ease 0.2s both' }}>
          {mode === 'signup' ? 'Start for free' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 1.7, marginBottom: 40, maxWidth: 280, animation: 'fadeUp 0.6s ease 0.3s both' }}>
          {mode === 'signup' ? 'No credit card required. Full access during beta.' : 'Sign in to manage conversations, reply with AI, and grow your support.'}
        </p>

        {mode === 'signup' ? (
          <div style={{ width: '100%', maxWidth: 300 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, animation: `checkIn 0.5s ease ${0.3 + i * 0.1}s both` }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span style={{ fontSize: 13.5, color: '#CBD5E1' }}>{f}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 300, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeUp 0.6s ease 0.4s both' }}>
            <p style={{ fontSize: 13.5, color: '#CBD5E1', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>
              &ldquo;heySynk replaced three tools we were using. Setup in 10 minutes, conversations rolling the same day.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>A</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Abhishek Malviya</div>
                <div style={{ fontSize: 11.5, color: '#64748B' }}>Founder, Riser Technologies</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40, fontSize: 14, color: '#64748B' }}>
            {mode === 'signin'
              ? <span>Don&apos;t have an account?{' '}<button onClick={() => switchMode('signup')} style={{ color: '#2563EB', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>Create one free</button></span>
              : <span>Already have an account?{' '}<button onClick={() => switchMode('signin')} style={{ color: '#2563EB', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>Sign in</button></span>
            }
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.5px', animation: 'fadeUp 0.5s ease 0.1s both' }}>
            {mode === 'signup' ? 'Create your account' : 'Sign in to heySynk'}
          </h2>
          <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 36 }}>
            {mode === 'signup' ? 'Set up your workspace in minutes.' : 'Enter your workspace and email to continue.'}
          </p>

          {step === 'workspace' && (
            <div style={{ animation: 'slideIn 0.35s ease' }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Workspace URL</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                  <span style={{ padding: '12px 14px', fontSize: 12, color: '#94A3B8', background: '#F8FAFC', borderRight: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>app.heysynk.app/</span>
                  <input className="hs-input" value={workspace}
                    onChange={e => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleContinue()}
                    placeholder="your-company" autoFocus
                    style={{ flex: 1, padding: '12px 14px', border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#0F172A', fontFamily: 'inherit' }} />
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>e.g. risertechnologies, acmecorp</p>
              </div>
              {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 16 }}>{error}</p>}
              <button className="hs-btn" onClick={handleContinue} disabled={!workspace.trim()} style={btnStyle(!!workspace.trim())}>
                Continue →
              </button>
            </div>
          )}

          {step === 'auth' && (
            <div style={{ animation: 'slideIn 0.35s ease' }}>
              <button onClick={() => { setStep('workspace'); setError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0, fontFamily: 'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                {workspace}.heysynk.app
              </button>

              {mode === 'signup' && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Full name</label>
                  <input className="hs-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" autoFocus style={inputStyle} />
                </div>
              )}

              <div style={{ marginBottom: mode === 'signup' ? 18 : 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Email address</label>
                <input className="hs-input" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com"
                  autoFocus={mode === 'signin'} onKeyDown={e => e.key === 'Enter' && !loading && handleAuth()} style={inputStyle} />
              </div>

              {mode === 'signup' && (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Password</label>
                    <input className="hs-input" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Min. 8 characters" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Confirm password</label>
                    <input className="hs-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Repeat your password"
                      onKeyDown={e => e.key === 'Enter' && !loading && handleAuth()} style={inputStyle} />
                  </div>
                </>
              )}

              {mode === 'signin' && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Password</label>
                    <button style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Forgot password?</button>
                  </div>
                  <input className="hs-input" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Enter your password"
                    onKeyDown={e => e.key === 'Enter' && !loading && handleAuth()} style={inputStyle} />
                </div>
              )}

              {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 16 }}>{error}</p>}
              <button className="hs-btn" onClick={handleAuth} disabled={loading || !email.trim()} style={btnStyle(!loading && !!email.trim() && !!password.trim())}>
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Free Account →' : 'Sign In →'}
              </button>
              <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 16 }}>
                {mode === 'signup' ? 'By signing up you agree to our Terms of Service and Privacy Policy' : 'Protected by heySynk Security · SSL Encrypted'}
              </p>
            </div>
          )}

          {step === 'otp' && (
            <div style={{ animation: 'slideIn 0.35s ease' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <p style={{ fontSize: 14, color: '#64748B' }}>We sent a 6-digit code to</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{email}</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Verification code</label>
                <input className="hs-input" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit code" autoFocus maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleOtp()}
                  style={{ ...inputStyle, fontSize: 20, fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.3em' }} />
              </div>
              {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 16 }}>{error}</p>}
              <button className="hs-btn" onClick={handleOtp} disabled={loading || otp.length < 6} style={btnStyle(!loading && otp.length === 6)}>
                {loading ? 'Verifying...' : mode === 'signup' ? 'Complete Setup →' : 'Sign In →'}
              </button>
              <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 16 }}>
                Didn&apos;t receive it?{' '}
                <button onClick={() => { setStep('auth'); setOtp('') }} style={{ color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Resend code</button>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
