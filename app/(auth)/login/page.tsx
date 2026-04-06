'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw new Error('Invalid email or password')
      const { data: agent } = await supabase
        .from('agents')
        .select('id, workspaces(slug)')
        .eq('user_id', authData.user.id)
        .single()
      if (!agent) throw new Error('Agent not found')
      const workspaceSlug = (agent.workspaces as any)?.slug
      if (workspaceSlug !== slug.toLowerCase().trim()) throw new Error('Workspace not found. Check your workspace URL.')
      router.push(`/${workspaceSlug}/inbox`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, outline: 'none', color: '#fff', fontSize: 14,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 12 }}>hs</div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>heySynk</div>
          <div style={{ color: '#94A3B8', fontSize: 14, marginTop: 4 }}>Sign in to your workspace</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, backdropFilter: 'blur(20px)' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>Workspace URL</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden' }}>
                <span style={{ padding: '12px 14px', fontSize: 13, color: '#64748B', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.08)' }}>app.heysynk.app/</span>
                <input type="text" placeholder="your-workspace" value={slug} onChange={e => setSlug(e.target.value)} required style={{ flex: 1, padding: '12px 14px', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>Email address</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1' }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: 12, color: '#60A5FA', textDecoration: 'none' }}>Forgot password?</a>
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#FCA5A5', fontSize: 13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg,#2563EB,#7C3AED)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#475569' }}>
          Need an account? <a href="https://heysynk.app" style={{ color: '#60A5FA', textDecoration: 'none' }}>Start free on heysynk.app</a>
        </p>
      </div>
    </div>
  )
}
