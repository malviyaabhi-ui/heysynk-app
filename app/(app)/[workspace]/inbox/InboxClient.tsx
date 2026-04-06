'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
interface KBCategory { id: string; name: string; slug: string; description: string; icon: string; color: string; position: number }
interface KBArticle {
  id: string; title: string; slug: string; body: string; excerpt: string
  status: string; tags: string[]; category_id: string | null; author_id: string | null
  created_at: string; updated_at: string
}
interface ContactRow { id: string; name: string; email: string; company: string; location: string; status: string; created_at: string }

const NAV = [
  { id: 'search',        label: 'Search',        icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' },
  { id: 'inbox',         label: 'Inbox',          icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'kb',            label: 'Knowledge Base', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'contacts',      label: 'Contacts',       icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'campaigns',     label: 'Campaigns',      icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { id: 'analytics',     label: 'Analytics',      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'integrations',  label: 'Integrations',   icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  { id: 'widget',        label: 'Chat Widget',    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { id: 'notifications', label: 'Notifications',  icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'visitors',      label: 'Live Visitors',  icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  { id: 'admin',         label: 'Admin Panel',    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const STATUS_TABS = ['open', 'pending', 'resolved', 'snoozed']
const PRIORITY_COLOR: Record<string, string> = { urgent: '#EF4444', high: '#F59E0B', normal: '#94A3B8' }
const KB_ICONS: Record<string, string> = {
  book:   'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  tool:   'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  bulb:   'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  lock:   'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  rocket: 'M13 10V3L4 14h7v7l9-11h-7z',
  chart:  'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  doc:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
}

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
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
function initials(name: string) { return (name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() }
function avatarColor(str: string) {
  const colors = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#F97316']
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + h * 31
  return colors[Math.abs(h) % colors.length]
}
function KBIcon({ id, size = 15, color = '#94A3B8' }: { id: string; size?: number; color?: string }) {
  const d = KB_ICONS[id] || KB_ICONS.book
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
}
function Placeholder({ icon, title, desc, accent }: { icon: string; title: string; desc: string; accent: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: '#F8FAFC' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#94A3B8', maxWidth: 320 }}>{desc}</div>
      </div>
      <div style={{ padding: '8px 20px', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 700 }}>Coming Soon</div>
    </div>
  )
}

export default function InboxClient({ agent, workspace }: { agent: Agent; workspace: Workspace }) {
  const router = useRouter()
  const supabase = createClient()
  const accent = workspace.accent_color || '#2563EB'

  const [activeNav, setActiveNav] = useState('inbox')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [statusTab, setStatusTab] = useState('open')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [noteMode, setNoteMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDraft, setAiDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [convSearch, setConvSearch] = useState('')
  const [kbCategories, setKbCategories] = useState<KBCategory[]>([])
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([])
  const [kbActiveCat, setKbActiveCat] = useState<string | null>(null)
  const [kbSearch, setKbSearch] = useState('')
  const [kbView, setKbView] = useState<'list' | 'edit' | 'new-cat'>('list')
  const [kbEditing, setKbEditing] = useState<Partial<KBArticle> | null>(null)
  const [kbSaving, setKbSaving] = useState(false)
  const [kbStatusFilter, setKbStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [kbRightTab, setKbRightTab] = useState<'Settings' | 'SEO' | 'TOC'>('Settings')
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('book')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [contactFilter, setContactFilter] = useState('all')
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ convs: Conversation[]; contacts: ContactRow[]; articles: KBArticle[] }>({ convs: [], contacts: [], articles: [] })
  const [searching, setSearching] = useState(false)

  const loadConversations = useCallback(async () => {
    const { data } = await supabase.from('conversations').select('*, contacts(id,name,email,company,location)').eq('workspace_id', workspace.id).eq('status', statusTab).order('last_message_at', { ascending: false })
    setConversations((data || []) as Conversation[])
  }, [workspace.id, statusTab])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (!activeConv) return
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', activeConv.id).order('created_at', { ascending: true })
      setMessages((data || []) as Message[])
    }
    load()
    const ch = supabase.channel(`conv:${activeConv.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` }, payload => setMessages(prev => [...prev, payload.new as Message])).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [activeConv])

  useEffect(() => {
    const ch = supabase.channel(`ws:${workspace.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${workspace.id}` }, () => loadConversations()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [workspace.id, loadConversations])

  async function sendMessage() {
    if (!reply.trim() || !activeConv) return
    setSending(true)
    await supabase.from('messages').insert({ conversation_id: activeConv.id, workspace_id: workspace.id, sender_type: 'agent', sender_id: agent.id, body: reply, type: noteMode ? 'note' : 'text', is_private: noteMode })
    await supabase.from('conversations').update({ last_message: reply, last_message_at: new Date().toISOString() }).eq('id', activeConv.id)
    setReply(''); setAiDraft(''); setSending(false); loadConversations()
  }

  async function getAIReply() {
    if (!activeConv) return
    setAiLoading(true); setAiDraft('')
    try {
      const context = messages.slice(-10).map(m => `${m.sender_type === 'contact' ? 'Customer' : 'Agent'}: ${m.body}`).join('\n')
      const res = await fetch('/api/ai/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context, customer_name: activeConv.contacts?.name || 'Customer', agent_name: agent.name, workspace_id: workspace.id }) })
      const data = await res.json()
      setAiDraft(data.reply || '')
    } catch { }
    setAiLoading(false)
  }

  async function resolveConversation() {
    if (!activeConv) return
    await supabase.from('conversations').update({ status: 'resolved' }).eq('id', activeConv.id)
    await fetch('/api/email/csat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: activeConv.id }) })
    setActiveConv(null); loadConversations()
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/login') }

  const filteredConvs = conversations.filter(c => !convSearch || c.contacts?.name?.toLowerCase().includes(convSearch.toLowerCase()) || c.last_message?.toLowerCase().includes(convSearch.toLowerCase()))

  const loadKBCats = useCallback(async () => {
    const { data } = await supabase.from('kb_categories').select('*').eq('workspace_id', workspace.id).order('position')
    setKbCategories((data || []) as KBCategory[])
  }, [workspace.id])

  const loadKBArticles = useCallback(async () => {
    let q = supabase.from('kb_articles').select('*').eq('workspace_id', workspace.id)
    if (kbActiveCat) q = q.eq('category_id', kbActiveCat)
    if (kbStatusFilter !== 'all') q = q.eq('status', kbStatusFilter)
    const { data } = await q.order('updated_at', { ascending: false })
    setKbArticles((data || []) as KBArticle[])
  }, [workspace.id, kbActiveCat, kbStatusFilter])

  useEffect(() => { if (activeNav === 'kb') { loadKBCats(); loadKBArticles() } }, [activeNav, loadKBCats, loadKBArticles])

  async function saveKBArticle(status?: string) {
    if (!kbEditing?.title?.trim()) return
    setKbSaving(true)
    const payload = { workspace_id: workspace.id, title: kbEditing.title, slug: kbEditing.slug || slugify(kbEditing.title), body: kbEditing.body || '', excerpt: kbEditing.excerpt || (kbEditing.body || '').slice(0, 120), status: status || kbEditing.status || 'draft', category_id: kbEditing.category_id || null, author_id: agent.id, tags: kbEditing.tags || [] }
    if (kbEditing.id) { await supabase.from('kb_articles').update(payload).eq('id', kbEditing.id) }
    else { await supabase.from('kb_articles').insert(payload) }
    setKbSaving(false); setKbView('list'); setKbEditing(null); loadKBArticles()
  }

  async function saveKBCat() {
    if (!newCatName.trim()) return
    await supabase.from('kb_categories').insert({ workspace_id: workspace.id, name: newCatName, slug: slugify(newCatName), description: newCatDesc, icon: newCatIcon, position: kbCategories.length })
    setNewCatName(''); setNewCatDesc(''); setNewCatIcon('book'); setKbView('list'); loadKBCats()
  }

  const filteredKBArticles = kbArticles.filter(a => !kbSearch || a.title.toLowerCase().includes(kbSearch.toLowerCase()) || (a.excerpt || '').toLowerCase().includes(kbSearch.toLowerCase()))

  const loadContacts = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false })
    setContacts((data || []) as ContactRow[])
  }, [workspace.id])

  useEffect(() => { if (activeNav === 'contacts') loadContacts() }, [activeNav, loadContacts])
  const filteredContacts = contacts.filter(c => (!contactSearch || c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.email?.toLowerCase().includes(contactSearch.toLowerCase())) && (contactFilter === 'all' || c.status === contactFilter))

  useEffect(() => {
    if (!globalSearch.trim()) { setSearchResults({ convs: [], contacts: [], articles: [] }); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const [{ data: cv }, { data: ct }, { data: ar }] = await Promise.all([
        supabase.from('conversations').select('*, contacts(id,name,email,company,location)').eq('workspace_id', workspace.id).ilike('last_message', `%${globalSearch}%`).limit(5),
        supabase.from('contacts').select('*').eq('workspace_id', workspace.id).or(`name.ilike.%${globalSearch}%,email.ilike.%${globalSearch}%`).limit(5),
        supabase.from('kb_articles').select('*').eq('workspace_id', workspace.id).ilike('title', `%${globalSearch}%`).limit(5),
      ])
      setSearchResults({ convs: (cv || []) as Conversation[], contacts: (ct || []) as ContactRow[], articles: (ar || []) as KBArticle[] })
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [globalSearch, workspace.id])

  return (
    <>
      <style>{`@keyframes glow-pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      <div style={{ display: 'flex', height: '100vh', background: '#fff', fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif', overflow: 'hidden' }}>

        {/* SIDEBAR */}
        <div style={{ width: sidebarCollapsed ? 56 : 200, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 2, flexShrink: 0, transition: 'width 0.2s', overflow: 'hidden' }}>
          {sidebarCollapsed ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 8, padding: '8px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>hs</div>
              <button onClick={() => setSidebarCollapsed(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 4px ${accent})`, animation: 'glow-pulse 2s ease-in-out infinite', display: 'block' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: 8, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>hs</div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>hey<span style={{ color: accent }}>Synk</span></span>
              </div>
              <button onClick={() => setSidebarCollapsed(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 4px ${accent})`, display: 'block' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>
          )}
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveNav(n.id)} title={n.label} style={{ width: 'calc(100% - 16px)', height: 38, borderRadius: 9, border: 'none', cursor: 'pointer', background: activeNav === n.id ? `${accent}15` : 'transparent', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', transition: 'background 0.15s' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={activeNav === n.id ? accent : '#94A3B8'} strokeWidth="1.8" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d={n.icon} /></svg>
              {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 600, color: activeNav === n.id ? accent : '#64748B', whiteSpace: 'nowrap' }}>{n.label}</span>}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={signOut} style={{ width: 'calc(100% - 16px)', height: 44, borderRadius: 10, background: '#F1F5F9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(agent.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials(agent.name)}</div>
            {!sidebarCollapsed && <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>Sign out</div>
            </div>}
          </button>
        </div>

        {/* SEARCH */}
        {activeNav === 'search' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '20px 32px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>Global Search</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', border: `2px solid ${accent}`, borderRadius: 12, padding: '10px 16px', maxWidth: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
                <input autoFocus value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search conversations, contacts, articles..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: '#0F172A', width: '100%' }} />
                {searching && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {!globalSearch && <div style={{ textAlign: 'center', padding: '80px 0', color: '#CBD5E1', fontSize: 15 }}>Type to search across everything</div>}
              {globalSearch && !searching && searchResults.convs.length === 0 && searchResults.contacts.length === 0 && searchResults.articles.length === 0 && <div style={{ textAlign: 'center', padding: '80px 0', color: '#94A3B8' }}>No results</div>}
              {searchResults.convs.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Conversations</div>
                  {searchResults.convs.map(c => (
                    <div key={c.id} onClick={() => { setActiveNav('inbox'); setActiveConv(c) }} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(c.contacts?.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials(c.contacts?.name || '?')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.contacts?.name}</div>
                        <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.articles.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Knowledge Base</div>
                  {searchResults.articles.map(a => (
                    <div key={a.id} onClick={() => { setActiveNav('kb'); setKbEditing(a); setKbView('edit') }} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{a.excerpt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INBOX */}
        {activeNav === 'inbox' && (
          <>
            <div style={{ width: 300, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Inbox</div>
                  <button style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', marginBottom: 12 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
                  <input placeholder="Search conversations..." value={convSearch} onChange={e => setConvSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#334155', width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {STATUS_TABS.map(s => (
                    <button key={s} onClick={() => { setStatusTab(s); setActiveConv(null) }} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: statusTab === s ? accent : 'transparent', color: statusTab === s ? '#fff' : '#64748B', textTransform: 'capitalize' }}>{s}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredConvs.length === 0 && <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8', fontSize: 13 }}>No {statusTab} conversations</div>}
                {filteredConvs.map(conv => {
                  const isActive = activeConv?.id === conv.id
                  const name = conv.contacts?.name || 'Unknown'
                  return (
                    <div key={conv.id} onClick={() => setActiveConv(conv)} style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #F8FAFC', background: isActive ? `${accent}0D` : 'transparent', borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(name), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', position: 'relative' }}>
                          {initials(name)}
                          {conv.unread_count > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: accent, border: '1.5px solid #fff' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: conv.unread_count > 0 ? 700 : 600, color: '#0F172A' }}>{name}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>{timeAgo(conv.last_message_at)}</div>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message || 'No messages yet'}</div>
                          {conv.priority !== 'normal' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[conv.priority], marginTop: 4 }} />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {activeConv ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(activeConv.contacts?.name || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(activeConv.contacts?.name || '?')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{activeConv.contacts?.name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{activeConv.contacts?.email} · {activeConv.channel}</div>
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
                      {aiLoading ? 'Thinking...' : 'AI Reply'}
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>No messages yet</div>}
                  {messages.map(msg => {
                    const isAgent = msg.sender_type === 'agent'
                    const isNote = msg.type === 'note' || msg.is_private
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
                        {isNote ? (
                          <div style={{ maxWidth: '75%', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>INTERNAL NOTE</div>
                            <div style={{ fontSize: 14, color: '#92400E', lineHeight: 1.6 }}>{msg.body}</div>
                          </div>
                        ) : (
                          <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isAgent ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isAgent ? accent : '#fff', border: isAgent ? 'none' : '1px solid #E2E8F0', color: isAgent ? '#fff' : '#334155', fontSize: 14, lineHeight: 1.6 }}>{msg.body}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {aiDraft && (
                  <div style={{ margin: '0 20px', background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: 12, padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>MIRA AI DRAFT</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setReply(aiDraft); setAiDraft('') }} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#7C3AED', color: '#fff', cursor: 'pointer' }}>Use this reply</button>
                        <button onClick={() => setAiDraft('')} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #C4B5FD', background: 'transparent', color: '#7C3AED', cursor: 'pointer' }}>x</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#4C1D95', lineHeight: 1.6 }}>{aiDraft}</div>
                  </div>
                )}
                <div style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '14px 20px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button onClick={() => setNoteMode(false)} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: noteMode ? '1.5px solid #E2E8F0' : `1.5px solid ${accent}`, background: noteMode ? 'transparent' : `${accent}15`, color: noteMode ? '#94A3B8' : accent, cursor: 'pointer' }}>Reply</button>
                    <button onClick={() => setNoteMode(true)} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: noteMode ? '1.5px solid #F59E0B' : '1.5px solid #E2E8F0', background: noteMode ? '#FFFBEB' : 'transparent', color: noteMode ? '#D97706' : '#94A3B8', cursor: 'pointer' }}>Note</button>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <textarea value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendMessage() }} placeholder={noteMode ? 'Write an internal note...' : 'Type a reply... (Cmd+Enter to send)'} rows={3} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, resize: 'none', outline: 'none', fontSize: 14, lineHeight: 1.6, border: noteMode ? '1.5px solid #FDE68A' : '1.5px solid #E2E8F0', background: noteMode ? '#FFFBEB' : '#F8FAFC', color: '#334155', fontFamily: 'inherit' }} />
                    <button onClick={sendMessage} disabled={sending || !reply.trim()} style={{ width: 40, height: 40, borderRadius: 10, border: 'none', flexShrink: 0, background: reply.trim() ? accent : '#E2E8F0', cursor: reply.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94A3B8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1.2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#CBD5E1' }}>Select a conversation</div>
              </div>
            )}

            {activeConv && activeConv.contacts && (
              <div style={{ width: 260, background: '#fff', borderLeft: '1px solid #E2E8F0', padding: 20, overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarColor(activeConv.contacts.name || ''), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{initials(activeConv.contacts.name || '')}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{activeConv.contacts.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{activeConv.contacts.email}</div>
                </div>
                {[{ label: 'Company', value: activeConv.contacts.company }, { label: 'Location', value: activeConv.contacts.location }, { label: 'Channel', value: activeConv.channel }, { label: 'Priority', value: activeConv.priority }, { label: 'Status', value: activeConv.status }].map(row => row.value && (
                  <div key={row.label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, textTransform: 'capitalize' }}>{row.value}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* KNOWLEDGE BASE */}
        {activeNav === 'kb' && (() => {
          if (kbView === 'edit' && kbEditing !== null) return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
              <div style={{ padding: '10px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button onClick={() => { setKbView('list'); setKbEditing(null) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Articles
                </button>
                {kbEditing.title && <span style={{ fontSize: 12, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />Unsaved changes</span>}
                <div style={{ flex: 1 }} />
                <button onClick={() => saveKBArticle('draft')} style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155' }}>Save Draft</button>
                <button onClick={() => saveKBArticle('published')} disabled={kbSaving} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: kbSaving ? 0.7 : 1 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {kbSaving ? 'Saving...' : 'Publish'}
                </button>
              </div>
              <div style={{ padding: '8px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                <select style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #E2E8F0', outline: 'none', color: '#334155', cursor: 'pointer', marginRight: 4 }}>
                  <option>Paragraph</option><option>Heading 1</option><option>Heading 2</option><option>Heading 3</option>
                </select>
                {([{ l: 'B', t: 'Bold' }, { l: 'I', t: 'Italic' }, { l: 'U', t: 'Underline' }] as { l: string; t: string }[]).map(b => (
                  <button key={b.t} title={b.t} style={{ width: 30, height: 28, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.l}</button>
                ))}
                <div style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 2px' }} />
                <button title="Ordered list" style={{ width: 30, height: 28, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" /></svg></button>
                <button title="Bullet list" style={{ width: 30, height: 28, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg></button>
                <button title="Link" style={{ width: 30, height: 28, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></button>
                <div style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 2px' }} />
                <button title="Undo" style={{ width: 30, height: 28, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                <button title="Redo" style={{ width: 30, height: 28, borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg></button>
                <div style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 2px' }} />
                <button onClick={async () => {
                  if (!kbEditing?.title?.trim()) return
                  setKbSaving(true)
                  try {
                    const res = await fetch('/api/ai/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: `Write a comprehensive help article titled: "${kbEditing.title}"`, customer_name: 'Reader', agent_name: agent.name, workspace_id: workspace.id }) })
                    const data = await res.json()
                    setKbEditing(p => ({ ...(p || {}), body: data.reply || '' }))
                  } catch { }
                  setKbSaving(false)
                }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: `linear-gradient(135deg,${accent},#7C3AED)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  AI Write
                </button>
                <button style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #E2E8F0', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  Link Article
                </button>
              </div>
              <div style={{ padding: '6px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: '#FAFAFA' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 4 }}>Insert Block:</span>
                {([{ label: 'Note', bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' }, { label: 'Warning', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' }, { label: 'Caution', bg: '#FEF9C3', color: '#CA8A04', border: '#FDE68A' }, { label: 'Info', bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE' }, { label: 'Tip', bg: '#F3E8FF', color: '#7C3AED', border: '#E9D5FF' }, { label: 'Success', bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' }] as { label: string; bg: string; color: string; border: string }[]).map(b => (
                  <button key={b.label} onClick={() => setKbEditing(p => ({ ...(p || {}), body: ((p?.body || '') + `\n\n[${b.label.toUpperCase()}] `) }))}
                    style={{ padding: '3px 10px', borderRadius: 5, border: `1px solid ${b.border}`, background: b.bg, color: b.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {b.label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '36px 60px' }}>
                  <input value={kbEditing.title || ''} placeholder="Article title..." onChange={e => setKbEditing(p => ({ ...(p || {}), title: e.target.value }))} style={{ width: '100%', fontSize: 28, fontWeight: 800, color: '#0F172A', border: 'none', outline: 'none', marginBottom: 20, fontFamily: 'inherit' }} />
                  <textarea value={kbEditing.body || ''} placeholder="Start writing your article... or use AI Write to generate content from your title." onChange={e => setKbEditing(p => ({ ...(p || {}), body: e.target.value }))} style={{ width: '100%', minHeight: 500, fontSize: 15, color: '#334155', lineHeight: 1.9, border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ width: 240, borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0' }}>
                    {(['Settings', 'SEO', 'TOC'] as const).map(tab => (
                      <button key={tab} onClick={() => setKbRightTab(tab)} style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: kbRightTab === tab ? accent : '#64748B', borderBottom: kbRightTab === tab ? `2px solid ${accent}` : '2px solid transparent' }}>{tab}</button>
                    ))}
                  </div>
                  {kbRightTab === 'Settings' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Category</div>
                        <select value={kbEditing.category_id || ''} onChange={e => setKbEditing(p => ({ ...(p || {}), category_id: e.target.value || null }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                          <option value="">No category</option>
                          {kbCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Sub-Category</div>
                        <input placeholder="e.g. Refunds, API Keys..." style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                          {['Quickstart', 'Installation', 'First Steps', 'FAQ'].map(t => (
                            <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: '#F1F5F9', color: '#64748B', cursor: 'pointer' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Tags</div>
                        <input placeholder="Add tag, press Enter..." style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { setKbEditing(p => ({ ...(p || {}), tags: [...((p || {}).tags || []), (e.target as HTMLInputElement).value.trim()] })); (e.target as HTMLInputElement).value = '' } }} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                          {(kbEditing.tags || []).map((t, i) => (
                            <span key={i} onClick={() => setKbEditing(p => ({ ...(p || {}), tags: (p?.tags || []).filter((_, j) => j !== i) }))} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: `${accent}15`, color: accent, cursor: 'pointer' }}>{t} x</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Details</div>
                        {[{ label: 'Views', value: '0' }, { label: 'Updated', value: kbEditing.updated_at ? timeAgo(kbEditing.updated_at) : '-' }, { label: 'Author', value: agent.name }].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: '#94A3B8' }}>{row.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {kbRightTab === 'SEO' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>SEO Title</div>
                        <input placeholder="Page title for search engines..." style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Meta Description</div>
                        <textarea placeholder="Brief description..." rows={4} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, resize: 'none', fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Slug</div>
                        <input value={kbEditing.slug || slugify(kbEditing.title || '')} onChange={e => setKbEditing(p => ({ ...(p || {}), slug: e.target.value }))} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 12, fontFamily: 'monospace', color: '#64748B' }} />
                      </div>
                    </div>
                  )}
                  {kbRightTab === 'TOC' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>Headings appear as you write.</div>
                      {(kbEditing.body || '').split('\n').filter(l => l.startsWith('#')).map((l, i) => {
                        const level = l.match(/^#+/)?.[0].length || 1
                        return <div key={i} style={{ fontSize: 12, color: '#334155', paddingLeft: (level - 1) * 12, marginBottom: 6 }}>{l.replace(/^#+\s*/, '')}</div>
                      })}
                      {!(kbEditing.body || '').includes('#') && <div style={{ fontSize: 12, color: '#CBD5E1' }}>No headings yet.</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )

          if (kbView === 'new-cat') return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 24 }}>New Category</div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' }}>Icon</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.keys(KB_ICONS).map(id => (
                      <button key={id} onClick={() => setNewCatIcon(id)} style={{ width: 38, height: 38, borderRadius: 9, border: newCatIcon === id ? `2px solid ${accent}` : '2px solid #E2E8F0', background: newCatIcon === id ? `${accent}12` : '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <KBIcon id={id} size={16} color={newCatIcon === id ? accent : '#94A3B8'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase' }}>Name</div>
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Getting Started" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 14, fontFamily: 'inherit' }} />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase' }}>Description</div>
                  <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 14, fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setKbView('list')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
                  <button onClick={saveKBCat} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create</button>
                </div>
              </div>
            </div>
          )

          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Knowledge Base</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{kbArticles.length} articles · {workspace.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '7px 12px', width: 200 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
                  <input placeholder="Search articles..." value={kbSearch} onChange={e => setKbSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#334155', width: '100%' }} />
                </div>
                <button style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
                  Help Centre
                </button>
                <button style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                  Sticky Widgets
                </button>
                <button onClick={() => { setKbEditing({ status: 'draft', category_id: kbActiveCat, tags: [] }); setKbView('edit') }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  New Article
                </button>
              </div>
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ width: 220, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Categories</div>
                    <button onClick={() => setKbView('new-cat')} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1.5px dashed ${accent}`, background: `${accent}08`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      New Category
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                    <button onClick={() => setKbActiveCat(null)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, background: kbActiveCat === null ? `${accent}12` : 'transparent' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={kbActiveCat === null ? accent : '#94A3B8'} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                      <span style={{ fontSize: 13, fontWeight: 600, color: kbActiveCat === null ? accent : '#334155' }}>All Articles</span>
                    </button>
                    {kbCategories.map(cat => (
                      <div key={cat.id} style={{ display: 'flex', alignItems: 'center', borderRadius: 8, background: kbActiveCat === cat.id ? `${accent}12` : 'transparent', marginBottom: 2 }}>
                        <button onClick={() => setKbActiveCat(cat.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left' }}>
                          <KBIcon id={cat.icon || 'book'} size={15} color={kbActiveCat === cat.id ? accent : '#94A3B8'} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: kbActiveCat === cat.id ? accent : '#334155' }}>{cat.name}</span>
                        </button>
                        <button onClick={async () => { if (confirm('Delete category?')) { await supabase.from('kb_categories').delete().eq('id', cat.id); if (kbActiveCat === cat.id) setKbActiveCat(null); loadKBCats(); loadKBArticles() } }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 8px', color: '#CBD5E1' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', minWidth: 0 }}>
                  <div style={{ background: '#fff', borderBottom: '1px solid #F1F5F9', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', flex: 1 }}>{kbActiveCat ? kbCategories.find(c => c.id === kbActiveCat)?.name : 'All Articles'} <span style={{ fontSize: 12, fontWeight: 400, color: '#94A3B8' }}>({filteredKBArticles.length})</span></span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['all', 'published', 'draft'] as const).map(s => (
                        <button key={s} onClick={() => setKbStatusFilter(s)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: kbStatusFilter === s ? accent : '#F1F5F9', color: kbStatusFilter === s ? '#fff' : '#64748B' }}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                    {filteredKBArticles.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '80px 0', color: '#94A3B8' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#CBD5E1', marginBottom: 8 }}>No articles yet</div>
                        <button onClick={() => { setKbEditing({ status: 'draft', category_id: kbActiveCat, tags: [] }); setKbView('edit') }} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Write first article</button>
                      </div>
                    )}
                    <div style={{ display: 'grid', gap: 10 }}>
                      {filteredKBArticles.map(article => {
                        const cat = kbCategories.find(c => c.id === article.category_id)
                        return (
                          <div key={article.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.07)')}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                            onClick={() => { setKbEditing(article); setKbView('edit') }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{article.title}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: article.status === 'published' ? '#DCFCE7' : '#FEF9C3', color: article.status === 'published' ? '#16A34A' : '#CA8A04' }}>{article.status}</span>
                              </div>
                              {article.excerpt && <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.excerpt}</div>}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {cat && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8' }}><KBIcon id={cat.icon || 'book'} size={11} color="#94A3B8" /> {cat.name}</span>}
                                <span style={{ fontSize: 11, color: '#CBD5E1' }}>Updated {timeAgo(article.updated_at)}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={async e => { e.stopPropagation(); await supabase.from('kb_articles').update({ status: article.status === 'published' ? 'draft' : 'published' }).eq('id', article.id); loadKBArticles() }} style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                                {article.status === 'published' ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
                              </button>
                              <button onClick={async e => { e.stopPropagation(); if (confirm('Delete?')) { await supabase.from('kb_articles').delete().eq('id', article.id); loadKBArticles() } }} style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #FEE2E2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* CONTACTS */}
        {activeNav === 'contacts' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Contacts</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{filteredContacts.length} contacts in {workspace.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '7px 12px', width: 220 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
                <input placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#334155', width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['all', 'active', 'new', 'inactive'].map(s => (
                  <button key={s} onClick={() => setContactFilter(s)} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: contactFilter === s ? accent : '#F1F5F9', color: contactFilter === s ? '#fff' : '#64748B' }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#CBD5E1', fontSize: 16, fontWeight: 700 }}>No contacts found</div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 100px', padding: '10px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                    {['Contact', 'Company', 'Status', 'Last Contact', 'Actions'].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>)}
                  </div>
                  {filteredContacts.map(c => (
                    <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 100px', padding: '14px 20px', borderBottom: '1px solid #F8FAFC', alignItems: 'center', background: '#fff' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(c.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(c.name || '')}</div>
                        <div><div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.name}</div><div style={{ fontSize: 12, color: '#64748B' }}>{c.email}</div></div>
                      </div>
                      <div style={{ fontSize: 13, color: '#334155' }}>{c.company || '-'}</div>
                      <div><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: c.status === 'active' ? '#DCFCE7' : c.status === 'new' ? '#DBEAFE' : '#F1F5F9', color: c.status === 'active' ? '#16A34A' : c.status === 'new' ? '#2563EB' : '#64748B' }}>{c.status || 'active'}</span></div>
                      <div style={{ fontSize: 13, color: '#64748B' }}>{timeAgo(c.created_at)}</div>
                      <div><button onClick={() => { setConvSearch(c.name || ''); setActiveNav('inbox') }} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${accent}`, background: `${accent}10`, color: accent, cursor: 'pointer' }}>View</button></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeNav === 'analytics' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Analytics</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Last 30 days</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                {[{ label: 'Total Conversations', value: conversations.length.toString(), color: accent }, { label: 'Avg Response Time', value: '< 2h', color: '#F59E0B' }, { label: 'CSAT Score', value: '4.8/5', color: '#8B5CF6' }, { label: 'Resolved Today', value: '-', color: '#16A34A' }].map(stat => (
                  <div key={stat.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginBottom: 8 }}>{stat.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: 14, fontWeight: 600 }}>Chart coming soon</div>
            </div>
          </div>
        )}

        {activeNav === 'integrations' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Integrations</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {([{ name: 'Turbo SMTP', desc: 'Email delivery', status: 'connected', color: '#F59E0B' }, { name: 'Supabase', desc: 'Database', status: 'connected', color: '#3ECF8E' }, { name: 'Anthropic', desc: 'Mira AI', status: 'connected', color: '#7C3AED' }, { name: 'Stripe', desc: 'Billing', status: 'soon', color: '#635BFF' }, { name: 'WhatsApp', desc: 'WA Business', status: 'soon', color: '#25D366' }, { name: 'Slack', desc: 'Notifications', status: 'soon', color: '#4A154B' }] as { name: string; desc: string; status: string; color: string }[]).map(int => (
                  <div key={int.name} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${int.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: int.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{int.name}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{int.desc}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: int.status === 'connected' ? '#DCFCE7' : '#F1F5F9', color: int.status === 'connected' ? '#16A34A' : '#94A3B8' }}>{int.status === 'connected' ? 'Connected' : 'Soon'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeNav === 'widget' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Chat Widget</div>
            </div>
            <div style={{ flex: 1, padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignContent: 'start' }}>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Installation</div>
                <div style={{ background: '#0F172A', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#94A3B8', lineHeight: 1.8 }}>
                  <span style={{ color: '#C4B5FD' }}>&lt;script&gt;</span><br />
                  &nbsp;&nbsp;window.heySynk = {'{ '}workspace: &apos;{workspace.slug}&apos;{' }'}<br />
                  <span style={{ color: '#C4B5FD' }}>&lt;/script&gt;</span>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Preview</div>
                <div style={{ position: 'relative', background: '#F8FAFC', borderRadius: 12, height: 240, border: '1px solid #E2E8F0' }}>
                  <div style={{ position: 'absolute', bottom: 16, right: 16, width: 52, height: 52, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'notifications' && <Placeholder accent={accent} icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" title="Notifications" desc="Configure agent alerts and notification preferences." />}

        {activeNav === 'visitors' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Live Visitors</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: '#DCFCE7', color: '#16A34A', fontSize: 12, fontWeight: 700 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', animation: 'glow-pulse 1.5s ease-in-out infinite' }} />
                Live
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 64, fontWeight: 800, color: accent }}>0</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#94A3B8' }}>visitors on your site right now</div>
              <button onClick={() => setActiveNav('widget')} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Set up Widget</button>
            </div>
          </div>
        )}

        {activeNav === 'admin' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Admin Panel</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{workspace.name} settings</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[{ title: 'Workspace Settings', desc: 'Name, slug, accent color' }, { title: 'Agents & Roles', desc: 'Invite agents, manage permissions' }, { title: 'Routing Rules', desc: 'Auto-assign conversations' }, { title: 'Billing', desc: 'Plan, usage, invoices' }].map(item => (
                  <div key={item.title} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.07)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeNav === 'campaigns' && <Placeholder accent={accent} icon="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" title="Campaigns" desc="Create and schedule campaigns to engage customers proactively." />}

      </div>
    </>
  )
}
