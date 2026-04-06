'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/* ── Types ── */
interface Agent { id: string; name: string; email: string; role: string; workspace_id: string }
interface Workspace { id: string; name: string; slug: string; accent_color: string }
interface Contact { id: string; name: string; email: string; company: string; location: string }
interface Conversation {
  id: string; status: string; channel: string; priority: string
  last_message: string; last_message_at: string; unread_count: number
  assigned_to: string; label: string; tags: string[]
  contacts: Contact | null
  sticky_note: string | null
}
interface Message {
  id: string; sender_type: string; sender_id: string
  body: string; type: string; is_private: boolean; created_at: string
}

const NAV = [
  { id: 'inbox', label: 'Inbox', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'kb', label: 'Knowledge Base', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'campaigns', label: 'Campaigns', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { id: 'visitors', label: 'Live Visitors', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'admin', label: 'Admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const STATUS_TABS = ['open', 'pending', 'resolved', 'snoozed']
const CHANNEL_ICON: Record<string, string> = {
  livechat: '💬', email: '📧', whatsapp: '📱', messenger: '💙'
}
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#EF4444', high: '#F59E0B', normal: '#94A3B8'
}

function timeAgo(ts: string) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function initials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function avatarColor(str: string) {
  const colors = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#F97316']
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + h * 31
  return colors[Math.abs(h) % colors.length]
}

export default function InboxClient({ agent, workspace }: { agent: Agent; workspace: Workspace }) {
  const router = useRouter()
  const supabase = createClient()
  const accent = workspace.accent_color || '#2563EB'

  /* state */
  const [activeNav, setActiveNav] = useState('inbox')
  const [statusTab, setStatusTab] = useState('open')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [noteMode, setNoteMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDraft, setAiDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')

  /* Load conversations */
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, contacts(id,name,email,company,location)')
      .eq('workspace_id', workspace.id)
      .eq('status', statusTab)
      .order('last_message_at', { ascending: false })
    setConversations((data || []) as Conversation[])
  }, [workspace.id, statusTab])

  useEffect(() => { loadConversations() }, [loadConversations])

  /* Load messages */
  useEffect(() => {
    if (!activeConv) return
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true })
      setMessages((data || []) as Message[])
    }
    load()
    // Realtime
    const channel = supabase.channel(`conv:${activeConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
        payload => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeConv])

  /* Realtime conv list */
  useEffect(() => {
    const channel = supabase.channel(`workspace:${workspace.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${workspace.id}` },
        () => loadConversations())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [workspace.id, loadConversations])

  async function sendMessage() {
    if (!reply.trim() || !activeConv) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      workspace_id: workspace.id,
      sender_type: noteMode ? 'agent' : 'agent',
      sender_id: agent.id,
      body: reply,
      type: noteMode ? 'note' : 'text',
      is_private: noteMode,
    })
    await supabase.from('conversations').update({
      last_message: reply,
      last_message_at: new Date().toISOString(),
    }).eq('id', activeConv.id)
    setReply('')
    setAiDraft('')
    setSending(false)
    loadConversations()
  }

  async function getAIReply() {
    if (!activeConv) return
    setAiLoading(true)
    setAiDraft('')
    try {
      const context = messages.slice(-10).map(m =>
        `${m.sender_type === 'contact' ? 'Customer' : 'Agent'}: ${m.body}`
      ).join('\n')
      const res = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          customer_name: activeConv.contacts?.name || 'Customer',
          agent_name: agent.name,
          workspace_id: workspace.id,
        }),
      })
      const data = await res.json()
      setAiDraft(data.reply || '')
      setReply(data.reply || '')
    } catch {}
    setAiLoading(false)
  }

  async function resolveConversation() {
    if (!activeConv) return
    await supabase.from('conversations').update({ status: 'resolved' }).eq('id', activeConv.id)
    // Send CSAT
    await fetch('/api/email/csat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: activeConv.id }),
    })
    setActiveConv(null)
    loadConversations()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = conversations.filter(c =>
    !search || c.contacts?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.last_message?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F1F5F9', fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', overflow: 'hidden' }}>

      {/* ── Rail nav ── */}
      <div style={{ width: 56, background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 4, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8, cursor: 'pointer' }}>hs</div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setActiveNav(n.id)} title={n.label} style={{
            width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: activeNav === n.id ? `${accent}33` : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeNav === n.id ? accent : '#475569'} strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
            </svg>
          </button>
        ))}
        {/* Spacer + avatar */}
        <div style={{ flex: 1 }} />
        <button onClick={signOut} title="Sign out" style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(agent.name), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          {initials(agent.name)}
        </button>
      </div>

      {/* ── Conversation list ── */}
      <div style={{ width: 300, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Inbox</div>
            <button style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', marginBottom: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
            <input placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#334155', width: '100%' }} />
          </div>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_TABS.map(s => (
              <button key={s} onClick={() => { setStatusTab(s); setActiveConv(null) }} style={{
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: statusTab === s ? accent : 'transparent',
                color: statusTab === s ? '#fff' : '#64748B',
                textTransform: 'capitalize', transition: 'all 0.15s',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13 }}>No {statusTab} conversations</div>
            </div>
          )}
          {filtered.map(conv => {
            const isActive = activeConv?.id === conv.id
            const name = conv.contacts?.name || 'Unknown'
            return (
              <div key={conv.id} onClick={() => setActiveConv(conv)} style={{
                padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #F8FAFC',
                background: isActive ? `${accent}0D` : 'transparent',
                borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
                transition: 'background 0.1s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(name), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', position: 'relative' }}>
                    {initials(name)}
                    {conv.unread_count > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: accent, border: '1.5px solid #fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: conv.unread_count > 0 ? 700 : 600, color: '#0F172A' }}>{name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, marginLeft: 4 }}>{timeAgo(conv.last_message_at)}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{conv.last_message || 'No messages yet'}</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11 }}>{CHANNEL_ICON[conv.channel] || '💬'}</span>
                      {conv.priority !== 'normal' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[conv.priority] }} />}
                      {conv.label && <span style={{ fontSize: 10, background: '#F1F5F9', color: '#64748B', padding: '1px 5px', borderRadius: 4 }}>{conv.label}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Conversation thread ── */}
      {activeConv ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Thread header */}
          <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(activeConv.contacts?.name || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials(activeConv.contacts?.name || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{activeConv.contacts?.name || 'Unknown'}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{activeConv.contacts?.email} · {CHANNEL_ICON[activeConv.channel]} {activeConv.channel}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {activeConv.status !== 'resolved' && (
                <button onClick={resolveConversation} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #22C55E', background: 'transparent', color: '#16A34A', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Resolve
                </button>
              )}
              <button onClick={getAIReply} disabled={aiLoading} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: aiLoading ? '#E2E8F0' : `linear-gradient(135deg,${accent},#7C3AED)`, color: aiLoading ? '#94A3B8' : '#fff', fontSize: 13, fontWeight: 700, cursor: aiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {aiLoading ? 'Thinking…' : 'AI Reply'}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 14 }}>No messages yet</div>
            )}
            {messages.map(msg => {
              const isAgent = msg.sender_type === 'agent'
              const isNote = msg.type === 'note' || msg.is_private
              const isAI = msg.sender_type === 'ai'
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
                  {isNote ? (
                    <div style={{ maxWidth: '75%', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        🔒 INTERNAL NOTE
                      </div>
                      <div style={{ fontSize: 14, color: '#92400E', lineHeight: 1.6 }}>{msg.body}</div>
                    </div>
                  ) : isAI ? (
                    <div style={{ maxWidth: '75%', background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: 12, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>✦ MIRA AI</div>
                      <div style={{ fontSize: 14, color: '#4C1D95', lineHeight: 1.6 }}>{msg.body}</div>
                    </div>
                  ) : (
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px', borderRadius: isAgent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isAgent ? accent : '#fff',
                      border: isAgent ? 'none' : '1px solid #E2E8F0',
                      color: isAgent ? '#fff' : '#334155', fontSize: 14, lineHeight: 1.6,
                    }}>{msg.body}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* AI draft banner */}
          {aiDraft && (
            <div style={{ margin: '0 20px', background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: 12, padding: '12px 14px', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                MIRA AI DRAFT
              </div>
              <div style={{ fontSize: 13, color: '#4C1D95', lineHeight: 1.6 }}>{aiDraft}</div>
            </div>
          )}

          {/* Reply box */}
          <div style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '14px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={() => setNoteMode(false)} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: noteMode ? '1.5px solid #E2E8F0' : `1.5px solid ${accent}`, background: noteMode ? 'transparent' : `${accent}15`, color: noteMode ? '#94A3B8' : accent, cursor: 'pointer' }}>Reply</button>
              <button onClick={() => setNoteMode(true)} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: noteMode ? '1.5px solid #F59E0B' : '1.5px solid #E2E8F0', background: noteMode ? '#FFFBEB' : 'transparent', color: noteMode ? '#D97706' : '#94A3B8', cursor: 'pointer' }}>🔒 Note</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendMessage() }}
                placeholder={noteMode ? 'Write an internal note… (only agents see this)' : 'Type a reply… (⌘+Enter to send)'}
                rows={3}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10, resize: 'none', outline: 'none', fontSize: 14, lineHeight: 1.6,
                  border: noteMode ? '1.5px solid #FDE68A' : '1.5px solid #E2E8F0',
                  background: noteMode ? '#FFFBEB' : '#F8FAFC',
                  color: '#334155', fontFamily: 'inherit',
                }}
              />
              <button onClick={sendMessage} disabled={sending || !reply.trim()} style={{
                width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0,
                background: reply.trim() ? accent : '#E2E8F0',
                cursor: reply.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94A3B8' }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#CBD5E1' }}>Select a conversation</div>
          <div style={{ fontSize: 14 }}>Pick one from the list to start replying</div>
        </div>
      )}

      {/* ── Contact panel ── */}
      {activeConv && activeConv.contacts && (
        <div style={{ width: 260, background: '#fff', borderLeft: '1px solid #E2E8F0', padding: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarColor(activeConv.contacts.name || ''), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
              {initials(activeConv.contacts.name || '')}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{activeConv.contacts.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{activeConv.contacts.email}</div>
          </div>
          {[
            { label: 'Company', value: activeConv.contacts.company },
            { label: 'Location', value: activeConv.contacts.location },
            { label: 'Channel', value: activeConv.channel },
            { label: 'Priority', value: activeConv.priority },
            { label: 'Status', value: activeConv.status },
          ].map(row => row.value && (
            <div key={row.label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{row.label}</div>
              <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, textTransform: 'capitalize' }}>{row.value}</div>
            </div>
          ))}
          {/* Sticky note */}
          {activeConv.sticky_note && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>📌 STICKY NOTE</div>
              <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>{activeConv.sticky_note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
