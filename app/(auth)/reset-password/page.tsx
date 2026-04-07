'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleReset() {
    if (!password.trim()) { setError('Enter a new password'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (e) { setError(e.message); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 14,
    fontFamily: 'inherit', background: '#fff', color: '#0F172A',
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif', background: '#FAFAF8', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .hs-input:focus { border-color:#2563EB !important; box-shadow:0 0 0 3px rgba(37,99,235,0.12) !important; }
        .hs-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(37,99,235,0.3); }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.5px' }}>Set new password</h2>
          <p style={{ fontSize: 14, color: '#94A3B8' }}>Choose a strong password for your heySynk account.</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px', background: '#DCFCE7', borderRadius: 12, border: '1px solid #BBF7D0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>Password updated!</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Redirecting to login...</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>New password</label>
              <input className="hs-input" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Min. 8 characters" autoFocus style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Confirm password</label>
              <input className="hs-input" value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="Repeat your password"
                onKeyDown={e => e.key === 'Enter' && !loading && handleReset()} style={inputStyle} />
            </div>
            {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 16 }}>{error}</p>}
            <button className="hs-btn" onClick={handleReset} disabled={loading || !password || !confirm}
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: password && confirm ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#E2E8F0', color: password && confirm ? '#fff' : '#94A3B8', fontSize: 15, fontWeight: 700, cursor: password && confirm ? 'pointer' : 'not-allowed', transition: 'transform 0.15s, box-shadow 0.15s' }}>
              {loading ? 'Updating...' : 'Update Password →'}
            </button>
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 16, cursor: 'pointer' }}
              onClick={() => router.push('/login')}>← Back to login</p>
          </div>
        )}
      </div>
    </div>
  )
}
