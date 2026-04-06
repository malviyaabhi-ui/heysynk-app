'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }
    // Get workspace slug
    const { data: agent } = await supabase
      .from('agents')
      .select('workspaces(slug)')
      .eq('email', email)
      .single()
    const slug = (agent?.workspaces as any)?.slug
    router.push(slug ? `/${slug}/inbox` : '/')
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/email/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResetSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0F172A,#1E1B4B)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>hs</div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>heySynk</span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 40, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
          {resetSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>Check your email</h2>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.</p>
              <button onClick={() => { setResetMode(false); setResetSent(false) }} style={{ marginTop: 24, fontSize: 14, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to login</button>
            </div>
          ) : resetMode ? (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Reset password</h2>
              <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 28px' }}>Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleReset}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 20 }} />
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <button onClick={() => setResetMode(false)} style={{ marginTop: 16, fontSize: 14, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>← Back to login</button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Sign in</h2>
              <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 28px' }}>Welcome back to heySynk.</p>
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 20 }}>{error}</div>
              )}
              <form onSubmit={handleLogin}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 16 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Password</label>
                  <button type="button" onClick={() => setResetMode(true)} style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Forgot password?</button>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 24 }} />
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Signing in…' : 'Sign in →'}
                </button>
              </form>
            </>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          © 2026 heySynk · <a href="https://heysynk.app" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>heysynk.app</a>
        </p>
      </div>
    </div>
  )
}
