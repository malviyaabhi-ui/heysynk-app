'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
    })
  }, [])

  function handleOrgName(val: string) {
    setOrgName(val)
    setSlug(slugify(val))
  }

  async function handleCreate() {
    if (!orgName.trim()) { setError('Enter your organisation name'); return }
    if (!slug.trim()) { setError('Invalid workspace URL'); return }
    setLoading(true); setError('')

    try {
      // Check slug not taken
      const { data: existing } = await supabase.from('workspaces').select('id').eq('slug', slug).single()
      if (existing) { setError('This workspace URL is already taken. Try another name.'); setLoading(false); return }

      // Create workspace
      const { data: ws, error: wsErr } = await supabase.from('workspaces').insert({
        name: orgName,
        slug,
        accent_color: '#2563EB',
        plan: 'starter',
      }).select().single()
      if (wsErr) { setError(wsErr.message); setLoading(false); return }

      // Create agent record
      const { error: agentErr } = await supabase.from('agents').insert({
        id: user.id,
        workspace_id: ws.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
        email: user.email,
        role: 'Admin',
        status: 'active',
      })
      if (agentErr && !agentErr.message.includes('duplicate')) {
        setError(agentErr.message); setLoading(false); return
      }

      // Log first login
      await supabase.from('agent_activity').insert({
        workspace_id: ws.id,
        agent_id: user.id,
        agent_name: user.user_metadata?.full_name || user.email,
        event: 'workspace_created',
        description: `Workspace "${orgName}" created`,
        metadata: { slug },
      })

      router.push(`/${slug}/inbox`)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 14,
    fontFamily: 'inherit', background: '#fff', color: '#0F172A',
    boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-8px) } }
        @keyframes pulseGlow { 0%,100% { box-shadow:0 0 32px rgba(37,99,235,0.4) } 50% { box-shadow:0 0 56px rgba(37,99,235,0.7) } }
        .hs-input:focus { border-color:#2563EB !important; box-shadow:0 0 0 3px rgba(37,99,235,0.12) !important; }
        .hs-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(37,99,235,0.3); }
      `}</style>

      {/* LEFT */}
      <div style={{ width: '42%', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 48px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'float 3s ease-in-out infinite, pulseGlow 3s ease-in-out infinite' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 12, textAlign: 'center', letterSpacing: '-0.5px', animation: 'fadeUp 0.6s ease 0.2s both' }}>
          One last step 🎉
        </h1>
        <p style={{ fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 1.7, marginBottom: 40, maxWidth: 280, animation: 'fadeUp 0.6s ease 0.3s both' }}>
          Set up your workspace and you'll be ready to handle customer support with AI in minutes.
        </p>

        <div style={{ width: '100%', maxWidth: 300 }}>
          {[
            { step: '1', label: 'Account created', done: true },
            { step: '2', label: 'Set up workspace', done: false, active: true },
            { step: '3', label: 'Invite your team', done: false },
            { step: '4', label: 'Install chat widget', done: false },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, animation: `fadeUp 0.5s ease ${0.3 + i * 0.1}s both` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.done ? '#16A34A' : s.active ? '#2563EB' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {s.done ? '✓' : s.step}
              </div>
              <span style={{ fontSize: 13.5, color: s.done ? '#4ADE80' : s.active ? '#fff' : '#64748B', fontWeight: s.active ? 700 : 400 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ flex: 1, background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px' }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.5s ease' }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.5px' }}>
            Set up your workspace
          </h2>
          <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 36 }}>
            This is your team's home in heySynk. You can change this later.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Organisation name</label>
            <input className="hs-input" value={orgName} onChange={e => handleOrgName(e.target.value)}
              placeholder="Acme Corp" autoFocus style={inputStyle} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Workspace URL</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <span style={{ padding: '12px 14px', fontSize: 12, color: '#94A3B8', background: '#F8FAFC', borderRight: '1.5px solid #E2E8F0', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>app.heysynk.app/</span>
              <input className="hs-input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="acme-corp"
                onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
                style={{ flex: 1, padding: '12px 14px', border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#0F172A', fontFamily: 'inherit' }} />
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>This is your unique workspace address. Lowercase letters, numbers, and hyphens only.</p>
          </div>

          {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 16 }}>{error}</p>}

          <button className="hs-btn" onClick={handleCreate} disabled={loading || !orgName.trim() || !slug.trim()}
            style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: orgName && slug ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#E2E8F0', color: orgName && slug ? '#fff' : '#94A3B8', fontSize: 15, fontWeight: 700, cursor: orgName && slug ? 'pointer' : 'not-allowed', transition: 'transform 0.15s, box-shadow 0.15s' }}>
            {loading ? 'Creating workspace...' : 'Create Workspace →'}
          </button>

          <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 16 }}>
            Already have a workspace?{' '}
            <button onClick={() => router.push('/login')} style={{ color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Sign in instead</button>
          </p>
        </div>
      </div>
    </div>
  )
}
