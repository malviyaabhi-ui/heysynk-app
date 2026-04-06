import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function InboxPage({ params }: { params: { workspace: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('name, role, workspaces(name, slug, accent_color)')
    .eq('user_id', user.id)
    .single()

  if (!agent) redirect('/login')

  const workspace = agent.workspaces as any

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8FAFC', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 56, background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: workspace.accent_color || '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>hs</div>
        {['inbox','kb','campaigns','visitors','analytics','admin'].map(section => (
          <a key={section} href={`/${params.workspace}/${section}`} style={{ width: 36, height: 36, borderRadius: 9, background: section === 'inbox' ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <div style={{ width: 16, height: 16, background: 'rgba(255,255,255,0.4)', borderRadius: 3 }} />
          </a>
        ))}
      </div>
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 32 }}>📬</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Inbox coming next</h1>
        <p style={{ color: '#64748B', fontSize: 15, margin: 0 }}>Logged in as <strong>{agent.name}</strong> · {workspace.name}</p>
      </div>
    </div>
  )
}
