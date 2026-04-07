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
  const [stickyOpen, setStickyOpen] = useState(false)
  const [notifTab, setNotifTab] = useState<'inbox'|'settings'>('inbox')
  const [notifEmail, setNotifEmail] = useState(agent.email || '')
  const [triggers, setTriggers] = useState({ new_conversation: true, customer_reply: true, ai_replied: true, resolved: false, urgent: true, digest: false })
  const [notifs, setNotifs] = useState<any[]>([])
  const unreadCount = notifs.filter(n => !n.read).length
  const [vpTab, setVpTab] = useState<'visitors'|'recent'|'settings'>('visitors')
  const [vpAlerts, setVpAlerts] = useState({ arrival: true, returning: true, checkout: true, long: false, autoSuggest: true })
  const [integModal, setIntegModal] = useState<any>(null)
  const [integSection, setIntegSection] = useState('all')
  const [integrations, setIntegrations] = useState<any[]>([
    { id:'whatsapp', section:'messaging', name:'WhatsApp Business', emoji:'💬', logoColor:'#25D366', desc:'Send and receive WhatsApp messages directly in heySynk.', features:['Receive customer WhatsApp messages','Send replies from heySynk inbox','Media & file support','Read receipts'], connected:false, popular:true, fields:[{id:'waPhone',label:'WhatsApp Business Phone',placeholder:'+1234567890',type:'text'},{id:'waToken',label:'API Access Token',placeholder:'EAAxxxxxxx',type:'password'}], events:['message.received','message.sent','message.read'] },
    { id:'slack', section:'messaging', name:'Slack', emoji:'📬', logoColor:'#4A154B', desc:'Get heySynk notifications and reply from Slack channels.', features:['New conversation alerts','Reply directly from Slack','Daily summary digest','Agent assignment notifications'], connected:false, popular:true, fields:[{id:'slackToken',label:'Bot User OAuth Token',placeholder:'xoxb-xxxxxx',type:'password'},{id:'slackChan',label:'Default Channel',placeholder:'#support',type:'text'}], events:['conversation.new','conversation.resolved','message.new'] },
    { id:'gmail', section:'email', name:'Gmail', emoji:'📧', logoColor:'#EA4335', desc:'Connect Gmail to receive and reply to emails inside heySynk.', features:['Email-to-conversation routing','Reply via heySynk inbox','Thread tracking','CC/BCC support'], connected:true, popular:true, fields:[{id:'gmailAddr',label:'Gmail Address',placeholder:'support@yourcompany.com',type:'email'}], events:['email.received','email.sent','email.bounced'] },
    { id:'hubspot', section:'crm', name:'HubSpot', emoji:'🦄', logoColor:'#FF7A59', desc:'Sync contacts, deals and conversations with HubSpot CRM.', features:['Contact sync bi-directional','Deal creation from conversations','Pipeline stage updates','Activity logging'], connected:false, popular:true, fields:[{id:'hsApiKey',label:'HubSpot API Key',placeholder:'pat-na1-xxxxxxxx',type:'password'}], events:['contact.created','contact.updated','deal.stageChanged'] },
    { id:'zapier', section:'automation', name:'Zapier', emoji:'⚡', logoColor:'#FF4A00', desc:'Connect heySynk to 5,000+ apps with no-code Zapier automations.', features:['Trigger zaps on new conversations','Send data to any Zapier app','Custom field mapping','Multi-step workflows'], connected:false, popular:true, apiKey:true, fields:[], events:['conversation.new','conversation.resolved','message.received'] },
    { id:'make', section:'automation', name:'Make', emoji:'🔄', logoColor:'#6D00CC', desc:'Build powerful multi-step automations with Make scenarios.', features:['Real-time triggers','Complex workflow scenarios','Data transformation'], connected:false, popular:false, apiKey:true, fields:[], events:['conversation.new','message.received'] },
    { id:'googleanalytics', section:'analytics', name:'Google Analytics 4', emoji:'📊', logoColor:'#F9AB00', desc:'Track chat widget interactions as GA4 events.', features:['Widget open/close events','Conversation start tracking','CSAT submission events'], connected:false, popular:false, fields:[{id:'gaMeasId',label:'Measurement ID',placeholder:'G-XXXXXXXXXX',type:'text'}], events:[] },
  ])
  const [campaignModal, setCampaignModal] = useState<any>(null)
  const [campaignRules, setCampaignRules] = useState<any[]>([{ trigger: 'Page URL contains', op: 'contains', value: '' }])
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [liveVisitors, setLiveVisitors] = useState<any[]>([])
  const [activityFilter, setActivityFilter] = useState('all')
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmailVal] = useState('')
  const [inviteRole, setInviteRole] = useState('Agent')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [profilePassword, setProfilePassword] = useState('')
  const [profileConfirm, setProfileConfirm] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [widgetChatMsg, setWidgetChatMsg] = useState('')
  const [widgetMessages, setWidgetMessages] = useState<{role:string;text:string}[]>([{ role: 'bot', text: 'Hi there! 👋 Welcome to heySynk Help. Ask me anything or browse articles below.' }])
  const [widgetTab, setWidgetTab] = useState<'chat'|'articles'>('chat')
  const [widgetAiLoading, setWidgetAiLoading] = useState(false)
  const [adminPage, setAdminPage] = useState('workspace')
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null)
  const [stickyWidgets, setStickyWidgets] = useState<any[]>([{ id: '1', name: 'Need more help?', position: 'right', scope: 'All Articles', enabled: true, color: 'blue', contentType: 'links', text: '', imageUrl: '', caption: '', links: [{ title: 'Contact Support', url: '#' }, { title: 'Video Tutorials', url: '#' }] }, { id: '2', name: 'Important Notice', position: 'left', scope: 'All Articles', enabled: false, color: 'amber', contentType: 'text', text: 'Our support hours are Mon–Fri, 9am–6pm.', imageUrl: '', caption: '', links: [] }])
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

  useEffect(() => {
    loadConversations()
    // Log login event
    supabase.from('agent_activity').insert({
      workspace_id: workspace.id,
      agent_id: agent.id,
      agent_name: agent.name,
      event: 'login',
      description: `${agent.name} signed in`,
      metadata: { role: agent.role, email: agent.email },
    }).then(() => {})
  }, [loadConversations])

  // Seed notifications from real conversations
  useEffect(() => {
    if (conversations.length === 0) return
    setNotifs(prev => {
      if (prev.length > 0) return prev // already seeded
      return conversations.slice(0, 3).map((c, i) => ({
        id: 'n_' + c.id,
        type: i === 0 ? 'new_conversation' : i === 1 ? 'customer_reply' : 'urgent',
        title: i === 0 ? `New conversation from ${c.contacts?.name || 'Unknown'}` : i === 1 ? `${c.contacts?.name || 'Unknown'} replied` : `Urgent: ${c.contacts?.name || 'Unknown'}`,
        preview: c.last_message || '',
        time: timeAgo(c.last_message_at),
        convId: c.id,
        conv: c,
        read: i === 2,
        emailSent: i < 2,
      }))
    })
  }, [conversations])

  useEffect(() => {
    if (!activeConv) return
    const load = async () => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', activeConv.id).order('created_at', { ascending: true })
      setMessages((data || []) as Message[])
    }
    load()
    const ch = supabase.channel(`conv:${activeConv.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` }, payload => {
      setMessages(prev => [...prev, payload.new as Message])
      const msg = payload.new as Message
      if (msg.sender_type === 'contact' && triggers.customer_reply) {
        setNotifs(prev => [{
          id: 'n_' + Date.now(), type: 'customer_reply',
          title: `${activeConv?.contacts?.name || 'Customer'} replied`,
          preview: msg.body, time: 'just now', convId: activeConv.id, conv: activeConv, read: false, emailSent: !!notifEmail,
        }, ...prev])
      }
    }).subscribe()
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
    logActivity('reply_sent', `Replied to ${activeConv?.contacts?.name || 'customer'}`, { conversation_id: activeConv?.id })
    if (triggers.ai_replied && noteMode === false) {
      setNotifs(prev => [{
        id: 'n_' + Date.now(), type: 'customer_reply',
        title: `Reply sent to ${activeConv?.contacts?.name || 'Customer'}`,
        preview: reply, time: 'just now', convId: activeConv?.id, conv: activeConv, read: false, emailSent: !!notifEmail,
      }, ...prev])
    }
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
    logActivity('resolve', `Resolved conversation with ${activeConv?.contacts?.name || 'customer'}`, { conversation_id: activeConv?.id })
    if (triggers.resolved) {
      setNotifs(prev => [{
        id: 'n_' + Date.now(), type: 'resolved',
        title: `Conversation with ${activeConv?.contacts?.name || 'Customer'} resolved`,
        preview: activeConv?.last_message || '', time: 'just now', convId: activeConv?.id, conv: activeConv, read: false, emailSent: !!notifEmail,
      }, ...prev])
    }
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

  useEffect(() => {
    if (activeNav !== 'kb') return
    loadKBCats()
    const seedKB = async () => {
      await loadKBArticles()
      const { count } = await supabase.from('kb_articles').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id)
      if ((count || 0) > 0) return
      const articles = [
        { workspace_id: workspace.id, title: 'Getting Started with heySynk', slug: 'getting-started', status: 'published', excerpt: 'Set up your workspace in minutes — install the widget, invite agents, and go live.', body: 'Welcome to heySynk! Install the Chat Widget by copying the embed code from Chat Widget in the sidebar. Then invite your team from Admin Panel > Agents. Mira AI comes pre-configured.', author_id: agent.id, category_id: null, tags: ['setup','onboarding'] },
        { workspace_id: workspace.id, title: 'How to Use Canned Responses', slug: 'canned-responses', status: 'published', excerpt: 'Speed up replies with pre-written templates. Type / in any chat to trigger them.', body: 'Canned responses let your team reply faster. In any conversation, type / followed by a shortcut name — e.g. /greet — and press Enter. Manage templates in Admin Panel > Canned Responses. Use {{customer_name}} as a variable.', author_id: agent.id, category_id: null, tags: ['productivity','shortcuts'] },
        { workspace_id: workspace.id, title: 'Understanding Mira AI', slug: 'mira-ai', status: 'published', excerpt: 'Learn how Mira AI drafts replies, writes articles, and tracks resolution rate.', body: 'Mira AI helps your team reply faster. Click AI Reply in any open conversation — Mira reads the history and drafts a contextual reply. In the KB editor, use AI Write to generate articles from a title. Track AI resolution rate in Analytics.', author_id: agent.id, category_id: null, tags: ['ai','mira'] },
        { workspace_id: workspace.id, title: 'Setting Up Email Notifications', slug: 'email-notifications', status: 'published', excerpt: 'Configure which events trigger email alerts and where they are sent.', body: 'Go to Notifications > Settings to enter your alert email. Enable triggers: New conversation, Customer reply, AI auto-reply sent, Conversation resolved, Urgent tag. Enable Daily Digest to get a morning summary.', author_id: agent.id, category_id: null, tags: ['notifications','email'] },
        { workspace_id: workspace.id, title: 'Routing Rules & Auto-Assignment', slug: 'routing-rules', status: 'draft', excerpt: 'Auto-assign conversations to agents based on priority, channel, or round-robin.', body: 'Go to Admin Panel > Routing Rules and click + New Rule. Available conditions: Priority is Urgent (assign to Support Lead), Channel is Email (assign to Email Team), All conversations (round-robin). Rules are evaluated top-to-bottom.', author_id: agent.id, category_id: null, tags: ['routing','assignment'] },
      ]
      for (const a of articles) { await supabase.from('kb_articles').insert(a) }
      loadKBArticles()
    }
    seedKB()
  }, [activeNav, loadKBCats, loadKBArticles])

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

  async function sendInvite() {
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) { setInviteError('Please fill in all fields'); return }
    setInviteLoading(true); setInviteError(''); setInviteSuccess('')
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inviteName, email: inviteEmail, password: invitePassword, role: inviteRole, workspace_id: workspace.id, workspace_slug: workspace.slug })
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error || 'Failed to send invite'); }
      else { setInviteSuccess(`✓ Invite sent to ${inviteEmail}`); setInviteName(''); setInviteEmailVal(''); setInvitePassword('')
          logActivity('invite_sent', `Invited ${inviteName} (${inviteEmail}) as ${inviteRole}`, { email: inviteEmail, role: inviteRole }) }
    } catch { setInviteError('Something went wrong') }
    setInviteLoading(false)
  }

  async function updatePassword() {
    if (!profilePassword.trim()) { setProfileMsg('Enter a new password'); return }
    if (profilePassword.length < 8) { setProfileMsg('Password must be at least 8 characters'); return }
    if (profilePassword !== profileConfirm) { setProfileMsg('Passwords do not match'); return }
    setProfileSaving(true); setProfileMsg('')
    const { error } = await supabase.auth.updateUser({ password: profilePassword })
    setProfileSaving(false)
    if (error) { setProfileMsg(error.message) }
    else { setProfileMsg('✓ Password updated successfully'); setProfilePassword(''); setProfileConfirm(''); logActivity('password_changed', `${agent.name} changed their password`, {}) }
  }

  async function logActivity(event: string, description: string, metadata: any = {}) {
    try {
      await supabase.from('agent_activity').insert({
        workspace_id: workspace.id,
        agent_id: agent.id,
        agent_name: agent.name,
        event,
        description,
        metadata,
      })
    } catch (e) { console.error('Activity log error:', e) }
  }

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
              {n.id === 'notifications' && unreadCount > 0 && <div style={{ position: 'absolute', top: 6, left: 22, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</div>}
              {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 600, color: activeNav === n.id ? accent : '#64748B', whiteSpace: 'nowrap' }}>{n.label}</span>}
              {!sidebarCollapsed && n.id === 'notifications' && unreadCount > 0 && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: '#EF4444', color: '#fff', marginLeft: 'auto' }}>{unreadCount}</span>}
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
        {activeNav === 'kb' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Persistent KB top header */}
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Knowledge Base</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{kbArticles.length} articles · {workspace.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '7px 12px', width: 200 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
                <input placeholder="Search articles..." value={kbSearch} onChange={e => setKbSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#334155', width: '100%' }} />
              </div>
              <button onClick={() => window.open('https://www.heysynk.app/help-centre', '_blank')} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
                Help Centre
              </button>
              <button onClick={() => setStickyOpen(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                Sticky Widgets
              </button>
              <button onClick={() => { setKbEditing({ status: 'draft', category_id: kbActiveCat, tags: [] }); setKbView('edit') }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                New Article
              </button>
            </div>
            {/* KB content area */}
            {(() => {
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
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Meta Title</div>
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>0 / 60</span>
                        </div>
                        <input placeholder="Page title for search engines..." style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Meta Description</div>
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>0 / 160</span>
                        </div>
                        <textarea placeholder="Brief summary for search snippets..." rows={4} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, resize: 'none', fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Keywords</div>
                        <input placeholder="refund, return, policy..." style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                        <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4 }}>Comma-separated keywords</div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Canonical URL</div>
                        <input placeholder="https://help.yoursite.com/..." style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Index / Follow</div>
                        <select style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                          <option>Index, Follow (default)</option>
                          <option>No Index, Follow</option>
                          <option>Index, No Follow</option>
                          <option>No Index, No Follow</option>
                        </select>
                      </div>
                      <button style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save SEO Settings</button>
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
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
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
          </div>
        )}

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
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Analytics</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{workspace.name} · Last 30 days</div>
              </div>
              <button style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                {([{ label: 'Conversations', value: String(conversations.length || 147), change: '↑ 12% vs last month', c: accent }, { label: 'Avg Response Time', value: '1h 42m', change: '↓ 8% improvement', c: '#0F172A' }, { label: 'AI Resolution Rate', value: '68%', change: '↑ 5% vs last month', c: accent }, { label: 'CSAT Score', value: '4.8 / 5', change: '↑ 0.2 pts', c: '#0F172A' }] as {label:string;value:string;change:string;c:string}[]).map(stat => (
                  <div key={stat.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 10 }}>{stat.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: stat.c, marginBottom: 6 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: '#16A34A' }}>{stat.change}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Conversation Volume</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Last 7 days</div>
                  <svg viewBox="0 0 420 140" style={{ width: '100%', height: 'auto' }} xmlns="http://www.w3.org/2000/svg">
                    {([24,38,29,45,52,41,36] as number[]).map((v, i) => {
                      const h = Math.round((v/52)*100); const x = i * 60; const y = 105 - h
                      return <g key={i}>
                        <rect x={x+8} y={y} width={44} height={h} rx={5} fill={accent} opacity={0.8} />
                        <text x={x+30} y={125} textAnchor="middle" fill="#94A3B8" fontSize={11}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</text>
                        <text x={x+30} y={y-5} textAnchor="middle" fill="#64748B" fontSize={10}>{v}</text>
                      </g>
                    })}
                  </svg>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Channels</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Traffic breakdown</div>
                  {([{ name: 'Live Chat', pct: 52, color: accent }, { name: 'Email', pct: 28, color: '#8B5CF6' }, { name: 'WhatsApp', pct: 13, color: '#16A34A' }, { name: 'Other', pct: 7, color: '#F59E0B' }] as {name:string;pct:number;color:string}[]).map(ch => (
                    <div key={ch.name} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#334155' }}>{ch.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{ch.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
                        <div style={{ height: 6, background: ch.color, borderRadius: 3, width: `${ch.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Agent Performance</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                  <thead><tr>
                    {(['Agent','Resolved','Avg Time','CSAT'] as string[]).map(h => (
                      <th key={h} style={{ textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.05em', padding: '0 0 12px', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {([{ name: agent.name, av: avatarColor(agent.name), in: initials(agent.name), resolved: 42, time: '1h 12m', csat: 4.9 }, { name: 'Sarah Connor', av: '#8B5CF6', in: 'SC', resolved: 38, time: '1h 45m', csat: 4.7 }, { name: 'Alex Morgan', av: '#16A34A', in: 'AM', resolved: 31, time: '2h 10m', csat: 4.5 }] as any[]).map(ag => (
                      <tr key={ag.name}>
                        <td style={{ padding: '12px 0 12px', borderBottom: '1px solid #F8FAFC' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: ag.av, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{ag.in}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{ag.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>{ag.resolved}</td>
                        <td style={{ fontSize: 13, color: '#64748B', padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>{ag.time}</td>
                        <td style={{ padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: ag.csat >= 4.8 ? '#16A34A' : '#F59E0B' }}>{ag.csat} ★</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'integrations' && (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Sidebar */}
            <div style={{ width: 200, background: '#fff', borderRight: '1px solid #E2E8F0', flexShrink: 0, overflowY: 'auto', padding: '12px 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', padding: '8px 10px 6px' }}>Categories</div>
              {([['all','All Integrations','🔗'],['messaging','Messaging','💬'],['email','Email','📧'],['crm','CRM & Helpdesk','🧑'],['automation','Automation','⚡'],['analytics','Analytics','📊']] as [string,string,string][]).map(([id,label,emoji]) => {
                const count = id === 'all' ? integrations.length : integrations.filter(i => i.section === id).length
                const connCount = id === 'all' ? integrations.filter(i => i.connected).length : integrations.filter(i => i.section === id && i.connected).length
                return (
                  <button key={id} onClick={() => setIntegSection(id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: integSection === id ? `${accent}12` : 'transparent', color: integSection === id ? accent : '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                    <span>{emoji}</span>
                    <span style={{ flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{count}</span>
                    {connCount > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />}
                  </button>
                )
              })}
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC' }}>
              <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Integrations</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{integrations.filter(i => i.connected).length} connected · {integrations.length} available</div>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                  {([{label:'Connected',value:String(integrations.filter(i=>i.connected).length),color:accent},{label:'Available',value:String(integrations.length),color:'#0F172A'},{label:'Events Today',value:'12.4K',color:'#0F172A'},{label:'Uptime',value:'99.8%',color:'#16A34A'}] as {label:string;value:string;color:string}[]).map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 3 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Cards */}
                {(() => {
                  const filtered = integSection === 'all' ? integrations : integrations.filter(i => i.section === integSection)
                  const connected = filtered.filter(i => i.connected)
                  const available = filtered.filter(i => !i.connected)
                  return (
                    <>
                      {connected.length > 0 && (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} /> Connected ({connected.length})
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                            {connected.map(integ => (
                              <div key={integ.id} style={{ background: '#fff', borderRadius: 12, border: `1.5px solid #22C55E30`, padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${integ.logoColor}18`, border: `1px solid ${integ.logoColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{integ.emoji}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{integ.name}</div>
                                    <div style={{ fontSize: 11, color: '#64748B' }}>{integ.desc}</div>
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#DCFCE7', color: '#16A34A', flexShrink: 0 }}>✓ Connected</span>
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                  {integ.features.slice(0,3).map((f: string) => <div key={f} style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}><span style={{ color: '#16A34A' }}>✓</span>{f}</div>)}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={() => setIntegModal(integ)} style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#334155' }}>Settings</button>
                                  <button onClick={() => setIntegrations(prev => prev.map(x => x.id === integ.id ? { ...x, connected: false } : x))} style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1.5px solid #FEE2E2', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#EF4444' }}>Disconnect</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {available.length > 0 && (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Available ({available.length})</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                            {available.map(integ => (
                              <div key={integ.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${integ.logoColor}18`, border: `1px solid ${integ.logoColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{integ.emoji}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{integ.name}{integ.popular && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: `${accent}15`, color: accent, marginLeft: 6 }}>Popular</span>}</div>
                                    <div style={{ fontSize: 11, color: '#64748B' }}>{integ.desc}</div>
                                  </div>
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                  {integ.features.slice(0,3).map((f: string) => <div key={f} style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}><span style={{ color: accent }}>✓</span>{f}</div>)}
                                </div>
                                <button onClick={() => setIntegModal(integ)} style={{ width: '100%', padding: '8px', borderRadius: 7, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Connect</button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {/* Activity log */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Recent Activity</div>
                      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '4px 0' }}>
                        {([['ok','WhatsApp message received from +971 50 123 4567','2m ago'],['ok','Gmail email routed to conversation #c1892','14m ago'],['ok','Zapier triggered: new_conversation webhook fired','1h ago'],['fail','HubSpot sync failed: contact duplicate detected','2h ago'],['ok','Slack alert sent to #support channel','3h ago'],['pending','Gmail webhook validation pending','5h ago']] as [string,string,string][]).map(([status,text,time]) => (
                          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid #F8FAFC' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: status === 'ok' ? '#DCFCE7' : status === 'fail' ? '#FEE2E2' : '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                              {status === 'ok' ? '✓' : status === 'fail' ? '✕' : '…'}
                            </div>
                            <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{text}</span>
                            <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{time}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
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
        )})()
        }

        {activeNav === 'notifications' && (() => {
          const NOTIF_ICONS: Record<string,string> = { new_conversation: '🆕', customer_reply: '💬', ai_replied: '✦', resolved: '✅', urgent: '🚨' }
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
              <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Notifications</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{unreadCount} unread</div>
                </div>
                {notifTab === 'inbox' && (
                  <button onClick={() => setNotifs(prev => prev.map(n => ({ ...n, read: true })))} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#64748B', fontWeight: 600 }}>Mark all read</button>
                )}
              </div>
              {/* Tabs */}
              <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 0 }}>
                {(['inbox', 'settings'] as const).map(tab => (
                  <button key={tab} onClick={() => setNotifTab(tab)}
                    style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: notifTab === tab ? accent : '#64748B', borderBottom: notifTab === tab ? `2px solid ${accent}` : '2px solid transparent', textTransform: 'capitalize' as const }}>
                    {tab === 'settings' ? '⚙ Settings' : 'Inbox'}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {notifTab === 'inbox' && (
                  <div>
                    {notifs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '80px 0' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>No notifications yet</div>
                        <div style={{ fontSize: 12, color: '#CBD5E1' }}>They'll show up here as events happen</div>
                      </div>
                    ) : notifs.map(n => (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 24px', borderBottom: '1px solid #F1F5F9', background: n.read ? '#fff' : `${accent}05`, cursor: 'pointer' }}
                        onClick={() => { setNotifs(prev => prev.map(x => x.id === n.id ? {...x, read: true} : x)); if (n.conv) { setActiveConv(n.conv); setActiveNav('inbox') } }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')} onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#fff' : `${accent}05`)}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {NOTIF_ICONS[n.type] || '🔔'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: n.read ? 600 : 700, color: '#0F172A' }}>{n.title}</span>
                            {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.preview}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {n.emailSent && <span style={{ fontSize: 11, color: '#94A3B8' }}>📧 Email sent</span>}
                            <span style={{ fontSize: 11, color: '#CBD5E1' }}>{n.time}</span>
                          </div>
                        </div>
                        <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>View Email</button>
                      </div>
                    ))}
                  </div>
                )}
                {notifTab === 'settings' && (
                  <div style={{ padding: 24, maxWidth: 560 }}>
                    {/* Delivery */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 12 }}>Delivery Address</div>
                      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Notify this email</label>
                        <input value={notifEmail} onChange={e => setNotifEmail(e.target.value)} type="email" placeholder="you@company.com"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', marginBottom: 6 }} />
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>All triggered notifications will be sent here.</div>
                      </div>
                    </div>
                    {/* Triggers */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 12 }}>Triggers</div>
                      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                        {([
                          { key: 'new_conversation', label: 'New conversation', desc: 'Customer opens a brand-new thread' },
                          { key: 'customer_reply', label: 'Customer reply', desc: 'Customer responds to an open conversation' },
                          { key: 'ai_replied', label: 'AI auto-reply sent', desc: 'AI generates and sends a response' },
                          { key: 'resolved', label: 'Conversation resolved', desc: 'A conversation is marked as resolved' },
                          { key: 'urgent', label: 'Urgent tag added', desc: 'A conversation is tagged as urgent' },
                        ] as {key: keyof typeof triggers; label: string; desc: string}[]).map((t, i, arr) => (
                          <div key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{t.label}</div>
                              <div style={{ fontSize: 12, color: '#94A3B8' }}>{t.desc}</div>
                            </div>
                            <div onClick={() => setTriggers(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                              style={{ width: 44, height: 24, borderRadius: 12, background: triggers[t.key] ? accent : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                              <div style={{ position: 'absolute', top: 2, left: triggers[t.key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Digest */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 12 }}>Digest</div>
                      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Daily summary email</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>Receive a daily digest at 9am</div>
                        </div>
                        <div onClick={() => setTriggers(prev => ({ ...prev, digest: !prev.digest }))}
                          style={{ width: 44, height: 24, borderRadius: 12, background: triggers.digest ? accent : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 2, left: triggers.digest ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>
                    </div>
                    <button style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Preferences</button>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {activeNav === 'visitors' && (() => {
          const demoRecent = [
            { name: 'Priya Sharma', page: '/pricing', location: 'Mumbai, IN', time: '2m ago', sessions: 3 },
            { name: 'Marcus Chen', page: '/checkout', location: 'San Francisco, US', time: '8m ago', sessions: 1 },
            { name: 'Anonymous', page: '/blog/setup-guide', location: 'London, UK', time: '15m ago', sessions: 1 },
          ]
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
              <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Live Visitors</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: '#DCFCE7', color: '#16A34A', fontSize: 12, fontWeight: 700 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', animation: 'glow-pulse 1.5s ease-in-out infinite' }} />
                  Live
                </div>
              </div>
              {/* Tabs */}
              <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex' }}>
                {([{ id: 'visitors', label: 'On Site', count: 0 }, { id: 'recent', label: 'Recent' }, { id: 'settings', label: 'Settings' }] as any[]).map(tab => (
                  <button key={tab.id} onClick={() => setVpTab(tab.id)}
                    style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: vpTab === tab.id ? accent : '#64748B', borderBottom: vpTab === tab.id ? `2px solid ${accent}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tab.label}
                    {tab.id === 'visitors' && <span style={{ fontSize: 10, fontWeight: 800, background: accent, color: '#fff', padding: '1px 6px', borderRadius: 10 }}>0</span>}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {vpTab === 'visitors' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, height: '100%' }}>
                    <div style={{ fontSize: 72, fontWeight: 800, color: accent }}>0</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#94A3B8' }}>visitors on your site right now</div>
                    <div style={{ fontSize: 13, color: '#CBD5E1' }}>Visitors appear here when your chat widget is installed</div>
                    <button onClick={() => setActiveNav('widget')} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Set up Widget</button>
                  </div>
                )}
                {vpTab === 'recent' && (
                  <div style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Recent Visitors</div>
                    {demoRecent.map((v, i) => (
                      <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor(v.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(v.name)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{v.name}</div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>{v.page} · {v.location}</div>
                        </div>
                        <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>{v.time}</div>
                          <div style={{ fontSize: 11, color: '#CBD5E1' }}>{v.sessions} session{v.sessions > 1 ? 's' : ''}</div>
                        </div>
                        <button style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${accent}`, background: `${accent}10`, color: accent, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>Chat</button>
                      </div>
                    ))}
                  </div>
                )}
                {vpTab === 'settings' && (
                  <div style={{ padding: 24, maxWidth: 500 }}>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 12 }}>Visitor Alerts</div>
                      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                        {([
                          { key: 'arrival', label: 'New visitor arrival', desc: 'Toast + sound when someone lands' },
                          { key: 'returning', label: 'Returning visitor', desc: 'Alert when a known contact returns' },
                          { key: 'checkout', label: 'Checkout page visit', desc: 'High-intent page alert' },
                          { key: 'long', label: 'Long session (5+ min)', desc: 'Engaged visitor alert' },
                        ] as {key: keyof typeof vpAlerts; label: string; desc: string}[]).map((t, i, arr) => (
                          <div key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{t.label}</div>
                              <div style={{ fontSize: 12, color: '#94A3B8' }}>{t.desc}</div>
                            </div>
                            <div onClick={() => setVpAlerts(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                              style={{ width: 44, height: 24, borderRadius: 12, background: vpAlerts[t.key] ? accent : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                              <div style={{ position: 'absolute', top: 2, left: vpAlerts[t.key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 12 }}>Proactive Chat</div>
                      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Auto-suggest message</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>AI drafts a greeting based on page</div>
                        </div>
                        <div onClick={() => setVpAlerts(prev => ({ ...prev, autoSuggest: !prev.autoSuggest }))}
                          style={{ width: 44, height: 24, borderRadius: 12, background: vpAlerts.autoSuggest ? accent : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 2, left: vpAlerts.autoSuggest ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {activeNav === 'admin' && (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Admin left nav */}
            <div style={{ width: 200, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', padding: '12px 8px' }}>
              {[
                { section: 'Workspace' },
                { id: 'workspace', label: 'General', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { id: 'branding', label: 'Branding', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
                { section: 'Team' },
                { id: 'agents', label: 'Agents', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                { id: 'canned', label: 'Canned Responses', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
                { id: 'csat', label: 'CSAT Surveys', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
                { id: 'routing', label: 'Routing Rules', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
                { id: 'permissions', label: 'Permissions', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                { id: 'roles', label: 'Roles', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                { section: 'Account' },
                { id: 'billing', label: 'Billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                { id: 'email', label: 'Email & SMTP', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                { id: 'activity', label: 'Activity Log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { id: 'security', label: 'My Password', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
                { id: 'danger', label: 'Danger Zone', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
              ].map((item: any) => item.section ? (
                <div key={item.section} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', padding: '10px 10px 5px' }}>{item.section}</div>
              ) : (
                <button key={item.id} onClick={() => setAdminPage(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: adminPage === item.id ? `${accent}12` : 'transparent', color: adminPage === item.id ? accent : '#64748B', fontSize: 12.5, fontWeight: 600, width: '100%', textAlign: 'left', transition: 'background 0.15s' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Admin content */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC' }}>
              {adminPage === 'workspace' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Workspace Settings</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Manage your workspace identity and configuration.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" /></svg>
                      Workspace Identity
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Workspace Name</label>
                        <input defaultValue={workspace.name} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Shown to all team members</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Workspace URL</label>
                        <input readOnly value={`app.heysynk.app/${workspace.slug}`} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', color: '#94A3B8' }} />
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Cannot be changed</div>
                      </div>
                    </div>
                    <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Feature Toggles</div>
                    {[
                      { label: 'AI Auto-Reply', desc: 'Let Mira AI respond automatically to incoming messages', on: true },
                      { label: 'Chat Widget', desc: 'Show live chat bubble on your website', on: true },
                      { label: 'Knowledge Base', desc: 'Expose help articles to customers', on: true },
                      { label: 'Email Notifications', desc: 'Send email alerts to agents on new messages', on: true },
                    ].map(f => (
                      <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{f.label}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{f.desc}</div>
                        </div>
                        <div style={{ width: 44, height: 24, borderRadius: 12, background: f.on ? accent : '#CBD5E1', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 2, left: f.on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminPage === 'branding' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Branding</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Customise your workspace colours and visual identity.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Accent Colour</div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Choose a colour preset</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['#2563EB','#7C3AED','#DC2626','#059669','#D97706','#0891B2','#DB2777','#1E293B'].map(c => (
                          <div key={c} onClick={async () => { await supabase.from('workspaces').update({ accent_color: c }).eq('id', workspace.id); window.location.reload() }}
                            style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer', border: workspace.accent_color === c ? '3px solid #0F172A' : '3px solid transparent' }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Custom Hex</label>
                        <input defaultValue={accent} placeholder="#2563eb" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                      </div>
                    </div>
                    <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Apply Branding</button>
                  </div>
                </div>
              )}

              {adminPage === 'agents' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Agents</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Manage team members and their access.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Team Members</div>
                      <button style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Invite Agent</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(agent.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials(agent.name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{agent.name} <span style={{ fontSize: 10, color: '#94A3B8' }}>(you)</span></div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>{agent.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${accent}15`, color: accent }}>{agent.role}</span>
                        <div style={{ fontSize: 11, color: '#16A34A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} /> Online now
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Invite more agents to collaborate</div>
                    <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 20, border: '1px dashed #E2E8F0' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Invite New Agent</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Full Name" style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                        <input value={inviteEmail} onChange={e => setInviteEmailVal(e.target.value)} placeholder="Email address" type="email" style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                          <option>Agent</option><option>Senior Agent</option><option>Support Lead</option><option>Admin</option>
                        </select>
                        <input value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Temporary password" type="password" style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                      </div>
                      {inviteError && <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 10 }}>{inviteError}</p>}
                      {inviteSuccess && <p style={{ fontSize: 12, color: '#16A34A', marginBottom: 10 }}>{inviteSuccess}</p>}
                      <button onClick={sendInvite} disabled={inviteLoading} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {inviteLoading ? 'Sending...' : 'Send Invite'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {adminPage === 'canned' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Canned Responses</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Quick reply templates for your team. Type / in chat to use them.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Templates</div>
                      <button style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ New Template</button>
                    </div>
                    {[
                      { shortcut: '/greet', title: 'Greeting', cat: 'General', body: 'Hi {{customer_name}}! 👋 Thank you for reaching out to us. How can I help you today?' },
                      { shortcut: '/sorry', title: 'Apology', cat: 'General', body: 'I sincerely apologize for any inconvenience this may have caused, {{customer_name}}. Let me look into this for you right away.' },
                      { shortcut: '/close', title: 'Closing', cat: 'General', body: 'Is there anything else I can help you with, {{customer_name}}? If not, have a wonderful day! 😊' },
                      { shortcut: '/wait', title: 'Please Wait', cat: 'General', body: 'Thank you for your patience, {{customer_name}}. I am looking into this and will get back to you shortly.' },
                      { shortcut: '/refund', title: 'Refund Policy', cat: 'Billing', body: 'Our refund policy allows returns within 30 days of purchase. I have initiated the refund process for you — it will appear in 3-5 business days.' },
                      { shortcut: '/ship', title: 'Shipping Info', cat: 'Shipping', body: 'Your order is on its way! Standard shipping takes 3-7 business days. You can track your order using the link in your confirmation email.' },
                      { shortcut: '/reset', title: 'Password Reset', cat: 'Technical', body: 'To reset your password, click "Forgot Password" on the login page and enter your email. You will receive a reset link within 2 minutes.' },
                    ].map(r => (
                      <div key={r.shortcut} style={{ padding: '14px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: `${accent}15`, color: accent, fontFamily: 'monospace' }}>{r.shortcut}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8, background: '#F1F5F9', color: '#64748B', marginLeft: 4 }}>{r.cat}</span>
                          <div style={{ flex: 1 }} />
                          <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#64748B' }}>Edit</button>
                          <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #FEE2E2', background: '#fff', cursor: 'pointer', color: '#EF4444' }}>Delete</button>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{r.body.replace(/{{customer_name}}/g, '[customer name]')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminPage === 'csat' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>CSAT Surveys</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Configure customer satisfaction surveys sent after conversations are resolved.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Survey Settings</div>
                    {[
                      { label: 'Send CSAT survey after resolve', desc: 'Automatically email survey when conversation is resolved', on: true },
                      { label: 'Include agent name in survey', desc: 'Show which agent handled the conversation', on: true },
                      { label: 'Allow anonymous responses', desc: 'Customers can skip identification', on: false },
                    ].map(f => (
                      <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{f.label}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{f.desc}</div>
                        </div>
                        <div style={{ width: 44, height: 24, borderRadius: 12, background: f.on ? accent : '#CBD5E1', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 2, left: f.on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Survey Message</div>
                    <textarea defaultValue="How satisfied were you with our support?" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, resize: 'none', fontFamily: 'inherit', marginBottom: 12 }} />
                    <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Settings</button>
                  </div>
                </div>
              )}

              {adminPage === 'routing' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Routing Rules</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Automatically assign conversations based on rules.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Active Rules</div>
                      <button style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ New Rule</button>
                    </div>
                    {[
                      { name: 'Urgent to Lead', condition: 'Priority = Urgent', action: 'Assign to Support Lead', active: true },
                      { name: 'Email channel', condition: 'Channel = Email', action: 'Assign to Email Team', active: true },
                      { name: 'Round Robin', condition: 'All conversations', action: 'Round-robin distribution', active: false },
                    ].map(r => (
                      <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.active ? '#16A34A' : '#CBD5E1', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>If {r.condition} → {r.action}</div>
                        </div>
                        <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#64748B' }}>Edit</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminPage === 'permissions' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Permissions</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Control what each role can access and do.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 0 12px', borderBottom: '1px solid #E2E8F0' }}>Permission</th>
                          {['Agent', 'Senior Agent', 'Support Lead'].map(r => (
                            <th key={r} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 16px 12px', borderBottom: '1px solid #E2E8F0' }}>{r}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { perm: 'View Conversations', vals: [true, true, true] },
                          { perm: 'Reply to Customers', vals: [true, true, true] },
                          { perm: 'Use AI Features', vals: [true, true, true] },
                          { perm: 'Assign Conversations', vals: [false, true, true] },
                          { perm: 'Access CRM', vals: [true, true, true] },
                          { perm: 'View Analytics', vals: [false, true, true] },
                          { perm: 'Edit Knowledge Base', vals: [false, true, true] },
                          { perm: 'Access Admin Panel', vals: [false, false, true] },
                        ].map(row => (
                          <tr key={row.perm}>
                            <td style={{ fontSize: 12.5, color: '#64748B', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>{row.perm}</td>
                            {row.vals.map((v, i) => (
                              <td key={i} style={{ textAlign: 'center', padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
                                {v ? <span style={{ color: accent, fontSize: 16 }}>✓</span> : <span style={{ color: '#CBD5E1', fontSize: 14 }}>—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminPage === 'roles' && (
                <div style={{ padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Roles</div>
                    <button style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ New Role</button>
                  </div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>Create custom roles with specific permissions for your team.</div>
                  <div style={{ background: `${accent}08`, border: `1px solid ${accent}30`, borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#64748B', marginBottom: 20 }}>
                    💡 Assign roles to agents in the <strong>Agents</strong> tab. Default roles cannot be deleted but can be edited.
                  </div>
                  {([
                    { id: 'role_agent', name: 'Agent', color: '#2563EB', desc: 'Standard support agent — handles customer conversations', isDefault: true, perms: ['View Conversations','Reply to Customers','Resolve Conversations','Use AI Features','Use Canned Responses','View Contacts','View Knowledge Base'] },
                    { id: 'role_senior', name: 'Senior Agent', color: '#7C3AED', desc: 'Experienced agent with assignment and analytics access', isDefault: true, perms: ['View Conversations','Reply to Customers','Resolve','Assign Conversations','Use AI Features','View Analytics','Edit Knowledge Base','Manage Campaigns'] },
                    { id: 'role_lead', name: 'Support Lead', color: '#059669', desc: 'Team lead with full access except billing and danger zone', isDefault: true, perms: ['View Conversations','Reply to Customers','Assign Conversations','Use AI Features','View Analytics','Export Reports','Edit Knowledge Base','Manage Agents','Admin Panel'] },
                    { id: 'role_admin', name: 'Admin', color: '#0F172A', desc: 'Full access to all features and settings', isDefault: true, perms: ['All permissions'] },
                  ] as any[]).map(role => (
                    <div key={role.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{role.name[0]}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {role.name}
                            {role.isDefault && <span style={{ fontSize: 10, background: '#F1F5F9', color: '#94A3B8', padding: '1px 7px', borderRadius: 10, border: '1px solid #E2E8F0' }}>Default</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{role.desc}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${accent}12`, color: accent, border: `1px solid ${accent}30` }}>{role.perms.length} permissions</span>
                          <button style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#334155' }}>Edit</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {role.perms.map((p: string) => (
                          <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {adminPage === 'billing' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Billing</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Manage your plan and usage.</div>
                  <div style={{ background: `linear-gradient(135deg, ${accent}, #7C3AED)`, borderRadius: 12, padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Pro Plan</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{workspace.name}</div>
                    </div>
                    <button style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#fff', color: accent, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Upgrade Plan</button>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Usage This Month</div>
                    {[
                      { label: 'Conversations', used: 147, total: 2000 },
                      { label: 'Agents', used: 1, total: 10 },
                      { label: 'AI Resolution Rate', used: 68, total: 100, suffix: '%' },
                    ].map(u => (
                      <div key={u.label} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{u.label}</span>
                          <span style={{ fontSize: 12, color: '#64748B' }}>{u.used}{u.suffix || ''} / {u.total}{u.suffix || ''}</span>
                        </div>
                        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
                          <div style={{ height: 6, background: accent, borderRadius: 3, width: `${Math.round(u.used / u.total * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Payment Method</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: 24 }}>💳</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Visa ending in 4242</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Expires 12/27 · Next billing: 1st of next month</div>
                      </div>
                      <button style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#64748B' }}>Update</button>
                    </div>
                  </div>
                </div>
              )}

              {adminPage === 'email' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Email & SMTP</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Configure your email delivery settings via Turbo SMTP.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>SMTP Configuration</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      {[{ label: 'SMTP Host', val: 'smtp.turbo-smtp.com' }, { label: 'SMTP Port', val: '587' }, { label: 'From Email', val: 'support@heysynk.app' }, { label: 'From Name', val: workspace.name }].map(f => (
                        <div key={f.label}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{f.label}</label>
                          <input defaultValue={f.val} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Settings</button>
                      <button style={{ padding: '8px 20px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Test Connection</button>
                    </div>
                  </div>
                </div>
              )}

              {adminPage === 'activity' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Activity Log</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>A full audit trail of workspace events.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    {[
                      { icon: '🔐', text: `${agent.name} signed in`, time: 'Just now' },
                      { icon: '✅', text: 'Conversation resolved by ' + agent.name, time: '2 hours ago' },
                      { icon: '📝', text: 'KB article updated', time: '5 hours ago' },
                      { icon: '⚙️', text: 'Workspace settings updated', time: 'Yesterday' },
                      { icon: '🤖', text: 'AI Reply sent to Layla Hassan', time: 'Yesterday' },
                      { icon: '👤', text: 'New contact added: Marcus Chen', time: '2 days ago' },
                    ].map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{e.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#334155' }}>{e.text}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{e.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminPage === 'security' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Change Password</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Update the password for your account: {agent.email}</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, maxWidth: 420 }}>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>New Password</label>
                      <input value={profilePassword} onChange={e => setProfilePassword(e.target.value)} type="password" placeholder="Min. 8 characters"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Confirm Password</label>
                      <input value={profileConfirm} onChange={e => setProfileConfirm(e.target.value)} type="password" placeholder="Repeat your password"
                        onKeyDown={e => e.key === 'Enter' && updatePassword()}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    </div>
                    {profileMsg && <p style={{ fontSize: 13, color: profileMsg.startsWith('✓') ? '#16A34A' : '#EF4444', marginBottom: 16 }}>{profileMsg}</p>}
                    <button onClick={updatePassword} disabled={profileSaving}
                      style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {profileSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              )}

              {adminPage === 'danger' && (
                <div style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Danger Zone</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>Irreversible actions. Proceed with care.</div>
                  <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #FEE2E2', padding: 24 }}>
                    {[
                      { label: 'Export All Data', desc: 'Download all conversations, contacts and settings as JSON', btn: 'Export' },
                      { label: 'Reset All Conversations', desc: 'Permanently delete all conversations in this workspace', btn: 'Reset' },
                      { label: 'Delete Workspace', desc: 'Permanently delete this workspace and all its data', btn: 'Delete Workspace' },
                    ].map(d => (
                      <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #FEE2E2' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{d.label}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{d.desc}</div>
                        </div>
                        <button style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid #EF4444', background: '#fff', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 16 }}>{d.btn}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeNav === 'campaigns' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Campaigns</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{workspace.name}</div>
              </div>
              <button onClick={() => setCampaignModal({ type: 'chat', icon: '💬', name: '', description: '', message: '', delay: 0 })} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                New Campaign
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                {([{ label: 'Active Campaigns', value: '3', color: accent }, { label: 'Messages Sent', value: '519', color: '#0F172A' }, { label: 'Replies', value: '146', color: '#0F172A' }, { label: 'Conversions', value: '66', color: '#16A34A' }] as {label:string;value:string;color:string}[]).map(s => (
                  <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '18px 20px' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                {([
                  { id:'cm1', name: 'Pricing Page Nudge', icon: '💰', desc: 'Greet visitors who spend 30s on pricing', type: 'Chat', status: 'active', sent: 142, opened: 89, replied: 34, conv: 12, rules: 'Page URL contains /pricing + Time ≥ 30s' },
                  { id:'cm2', name: 'Cart Abandonment', icon: '🛒', desc: 'Re-engage visitors who viewed the cart', type: 'Chat', status: 'active', sent: 87, opened: 61, replied: 28, conv: 19, rules: 'Page URL contains /cart + Time ≥ 60s' },
                  { id:'cm3', name: 'Returning Customer Welcome', icon: '🔄', desc: 'Welcome back known contacts', type: 'Chat', status: 'active', sent: 234, opened: 198, replied: 76, conv: 31, rules: 'Is returning visitor' },
                  { id:'cm4', name: 'Exit Intent Offer', icon: '🚪', desc: 'Last-chance banner before visitor leaves', type: 'Banner', status: 'paused', sent: 56, opened: 40, replied: 8, conv: 4, rules: 'Page URL contains /' },
                  { id:'cm5', name: 'New Feature Announcement', icon: '✨', desc: 'Tell users about new Magic Browse feature', type: 'Email', status: 'draft', sent: 0, opened: 0, replied: 0, conv: 0, rules: 'Visit count ≥ 2' },
                ] as any[]).map(camp => (
                  <div key={camp.name} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{camp.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{camp.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: camp.status === 'active' ? '#DCFCE7' : '#FEF9C3', color: camp.status === 'active' ? '#16A34A' : '#CA8A04' }}>{camp.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{camp.desc}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', background: '#F8FAFC', padding: '3px 8px', borderRadius: 5, display: 'inline-block' }}>🎯 {camp.rules}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#64748B' }}>{camp.status === 'active' ? 'Pause' : 'Activate'}</button>
                        <button onClick={() => setCampaignModal(camp)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#64748B' }}>Edit</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, background: '#F8FAFC', borderRadius: 8, padding: '12px 16px' }}>
                      {([{ l: 'Sent', v: camp.sent }, { l: 'Opened', v: camp.opened }, { l: 'Replied', v: camp.replied }, { l: 'Conv.', v: camp.conv }] as {l:string;v:number}[]).map(s => (
                        <div key={s.l} style={{ textAlign: 'center' as const }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{s.v}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* INTEGRATION CONFIG MODAL */}
      {integModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${integModal.logoColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{integModal.emoji}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{integModal.name}</div>
                <div style={{ fontSize: 12, color: integModal.connected ? '#16A34A' : '#94A3B8' }}>{integModal.connected ? 'Connected ✓' : 'Not connected'}</div>
              </div>
              <button onClick={() => setIntegModal(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {integModal.fields && integModal.fields.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Configuration</div>
                  {integModal.fields.map((f: any) => (
                    <div key={f.id} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                    </div>
                  ))}
                </>
              )}
              {integModal.apiKey && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>API Key</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input readOnly value={`sk_live_${workspace.slug}_${integModal.id}_xxxx`} style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 12, fontFamily: 'monospace', color: '#64748B', background: '#F8FAFC' }} />
                    <button style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Copy</button>
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Webhook URL</div>
              <div style={{ background: '#0F172A', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#94A3B8', marginBottom: 18 }}>
                <span style={{ color: '#C4B5FD' }}>POST</span> <span style={{ color: '#6EE7B7' }}>https://api.heysynk.app/webhooks/{integModal.id}/{workspace.slug}</span>
              </div>
              {integModal.events && integModal.events.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Events to sync</div>
                  {integModal.events.map((ev: string) => (
                    <div key={ev} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>{ev}</span>
                      <div style={{ width: 36, height: 20, borderRadius: 10, background: accent, cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Connection Test</div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Test Connection
                </button>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setIntegModal(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
              <button onClick={() => { setIntegrations((prev: any[]) => prev.map(x => x.id === integModal.id ? { ...x, connected: true } : x)); setIntegModal(null) }}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {integModal.connected ? 'Save Changes' : `Connect ${integModal.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGN EDITOR MODAL */}
      {campaignModal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{campaignModal.id ? 'Edit Campaign' : 'New Campaign'}</span>
              <button onClick={() => setCampaignModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>Campaign Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Campaign Name</label>
                    <input defaultValue={campaignModal.name || ''} placeholder="e.g. Pricing Page Nudge" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Icon</label>
                    <input defaultValue={campaignModal.icon || '💬'} style={{ width: '100%', padding: '9px 8px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 22, textAlign: 'center' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Description</label>
                  <input defaultValue={campaignModal.description || ''} placeholder="What does this campaign do?" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>Message Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {([{id:'chat',icon:'💬',name:'Chat Message',desc:'Appears in the live widget'},{id:'email',icon:'📧',name:'Email',desc:"Sent to visitor's email"},{id:'banner',icon:'📢',name:'Site Banner',desc:'Top bar on your website'}] as any[]).map(t => (
                    <div key={t.id} onClick={() => setCampaignModal((p: any) => ({ ...p, type: t.id }))}
                      style={{ padding: 14, borderRadius: 10, border: `2px solid ${(campaignModal.type||'chat') === t.id ? accent : '#E2E8F0'}`, background: (campaignModal.type||'chat') === t.id ? `${accent}08` : '#F8FAFC', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>Message</div>
                <textarea defaultValue={campaignModal.message || ''} placeholder="Hi there! 👋 I noticed you're browsing. Can I help?" rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>Trigger Rules</div>
                {campaignRules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={rule.trigger} onChange={e => setCampaignRules(prev => prev.map((r,j) => j===i ? {...r, trigger: e.target.value} : r))}
                      style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                      {['Page URL contains','Page URL is exactly','Time on page (seconds)','Session duration (seconds)','Scroll depth (%)','Visit count (>=)','Referrer contains','Is returning visitor'].map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <select value={rule.op} onChange={e => setCampaignRules(prev => prev.map((r,j) => j===i ? {...r, op: e.target.value} : r))}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                      {['contains','does not contain','is','is not','>','>=','='].map(o => <option key={o}>{o}</option>)}
                    </select>
                    <input value={rule.value} onChange={e => setCampaignRules(prev => prev.map((r,j) => j===i ? {...r, value: e.target.value} : r))}
                      placeholder="value" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                    {campaignRules.length > 1 && (
                      <button onClick={() => setCampaignRules(prev => prev.filter((_,j) => j!==i))}
                        style={{ width: 28, height: 36, borderRadius: 7, border: '1px solid #FEE2E2', background: '#fff', color: '#EF4444', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setCampaignRules(prev => [...prev, {trigger:'Page URL contains', op:'contains', value:''}])}
                  style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, border: `1.5px dashed ${accent}`, background: `${accent}08`, color: accent, cursor: 'pointer', marginTop: 4 }}>
                  + Add Rule
                </button>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>Delay</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="number" defaultValue={campaignModal.delay || 0} min={0} style={{ width: 100, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                  <span style={{ fontSize: 13, color: '#64748B' }}>seconds after trigger condition is met</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => setCampaignModal(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
              <button onClick={() => setCampaignModal(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#334155' }}>Save Draft</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setCampaignModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Activate Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING HELP CENTRE CHAT WIDGET */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }}>
        {widgetOpen && (
          <div style={{ width: 380, height: 560, background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', marginBottom: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {/* Widget header */}
            <div style={{ background: `linear-gradient(135deg, ${accent}, #7C3AED)`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>hs</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>heySynk Help</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} /> Online · Mira AI
                </div>
              </div>
              <button onClick={() => setWidgetOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20, padding: 2 }}>×</button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              {(['chat','articles'] as const).map(tab => (
                <button key={tab} onClick={() => setWidgetTab(tab)}
                  style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: widgetTab === tab ? accent : '#64748B', borderBottom: widgetTab === tab ? `2px solid ${accent}` : '2px solid transparent', textTransform: 'capitalize' }}>
                  {tab === 'chat' ? '💬 Chat' : '📚 Articles'}
                </button>
              ))}
            </div>
            {/* Chat tab */}
            {widgetTab === 'chat' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {widgetMessages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      {m.role === 'bot' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' }}>M</div>}
                      <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? accent : '#F1F5F9', color: m.role === 'user' ? '#fff' : '#334155', fontSize: 13, lineHeight: 1.6 }}>{m.text}</div>
                    </div>
                  ))}
                  {widgetAiLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>M</div>
                      <div style={{ background: '#F1F5F9', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', display: 'flex', gap: 4 }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', animation: `glow-pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px 14px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <input value={widgetChatMsg} onChange={e => setWidgetChatMsg(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key !== 'Enter' || !widgetChatMsg.trim()) return
                      const userMsg = widgetChatMsg.trim()
                      setWidgetMessages(prev => [...prev, { role: 'user', text: userMsg }])
                      setWidgetChatMsg('')
                      setWidgetAiLoading(true)
                      try {
                        const res = await fetch('/api/ai/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: `Help centre customer question: "${userMsg}"`, customer_name: 'Visitor', agent_name: 'Mira AI', workspace_id: workspace.id }) })
                        const data = await res.json()
                        setWidgetMessages(prev => [...prev, { role: 'bot', text: data.reply || 'I\'m not sure about that. Would you like to speak with a support agent?' }])
                      } catch { setWidgetMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I ran into an issue. Please try again.' }]) }
                      setWidgetAiLoading(false)
                    }}
                    placeholder="Ask Mira AI anything…" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit' }} />
                  <button onClick={() => setWidgetOpen(false)} style={{ fontSize: 11, padding: '9px 12px', borderRadius: 10, border: 'none', background: `${accent}15`, color: accent, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Talk to agent</button>
                </div>
              </>
            )}
            {/* Articles tab */}
            {widgetTab === 'articles' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <a href="https://www.heysynk.app/help-centre" target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: accent, textDecoration: 'none' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Open full Help Centre
                  </a>
                </div>
                {kbArticles.filter(a => a.status === 'published').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94A3B8', fontSize: 13 }}>No articles published yet</div>
                ) : kbArticles.filter(a => a.status === 'published').map(article => (
                  <div key={article.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{article.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.excerpt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Trigger button */}
        <button onClick={() => setWidgetOpen(v => !v)}
          style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${accent}, #7C3AED)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.2)', transition: 'transform 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
          {widgetOpen
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          }
        </button>
      </div>

      {/* STICKY WIDGET MANAGER MODAL */}
      {stickyOpen && (() => {
        const COLORS = [
          { name: 'blue',   hex: '#2563EB' },
          { name: 'green',  hex: '#059669' },
          { name: 'amber',  hex: '#D97706' },
          { name: 'red',    hex: '#DC2626' },
          { name: 'purple', hex: '#7C3AED' },
          { name: 'slate',  hex: '#475569' },
        ]
        const w = stickyWidgets.find(x => x.id === selectedWidget)
        const contentType = (w as any)?.contentType || 'text'

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
              {/* Header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Sticky Widget Manager</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => { setStickyOpen(false); setSelectedWidget(null) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body */}
              <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Left list */}
                <div style={{ width: 220, borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Widgets ({stickyWidgets.length})</span>
                    <button onClick={() => {
                      const id = 'w_' + Date.now()
                      setStickyWidgets(prev => [...prev, { id, name: 'New Widget', enabled: true, color: 'blue', position: 'right', contentType: 'text', text: '', imageUrl: '', caption: '', links: [], scope: 'All Articles' }])
                      setSelectedWidget(id)
                    }} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ New</button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                    {stickyWidgets.map(sw => {
                      const col = COLORS.find(c => c.name === sw.color) || COLORS[0]
                      return (
                        <div key={sw.id} onClick={() => setSelectedWidget(sw.id)}
                          style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selectedWidget === sw.id ? `${accent}10` : 'transparent', border: `1.5px solid ${selectedWidget === sw.id ? accent + '40' : 'transparent'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.hex, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sw.name}</span>
                            {sw.enabled && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: '#DCFCE7', color: '#16A34A' }}>On</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', paddingLeft: 14 }}>
                            {sw.position === 'right' ? '▶ Right' : '◀ Left'} · {sw.scope}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right editor */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {w ? (
                    <div style={{ padding: 24 }}>
                      {/* Widget Title */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Widget Title</div>
                        <input value={w.name} onChange={e => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, name: e.target.value } : x))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: '#0F172A', background: '#F8FAFC' }} />
                      </div>

                      {/* Position + Colour row */}
                      <div style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Position</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[{ val: 'left', label: 'Left' }, { val: 'right', label: 'Right' }].map(pos => (
                              <button key={pos.val} onClick={() => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, position: pos.val } : x))}
                                style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${(w as any).position === pos.val ? accent : '#E2E8F0'}`, background: (w as any).position === pos.val ? `${accent}10` : '#F8FAFC', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: (w as any).position === pos.val ? accent : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {pos.val === 'left' ? <path d="M3 12h18M3 6h6M3 18h6" /> : <path d="M3 12h18M15 6h6M15 18h6" />}
                                </svg>
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Colour</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {COLORS.map(c => (
                              <button key={c.name} onClick={() => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, color: c.name } : x))}
                                style={{ width: 28, height: 28, borderRadius: 8, background: c.hex, border: w.color === c.name ? '3px solid #0F172A' : '3px solid transparent', cursor: 'pointer', padding: 0, transition: 'border 0.15s' }} />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Content Type */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Content Type</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[{ val: 'text', label: 'Text', icon: '📝' }, { val: 'image', label: 'Image', icon: '🖼️' }, { val: 'links', label: 'Links', icon: '🔗' }, { val: 'mixed', label: 'Mixed', icon: '✨' }].map(ct => (
                            <button key={ct.val} onClick={() => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, contentType: ct.val } as any : x))}
                              style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1.5px solid ${contentType === ct.val ? accent : '#E2E8F0'}`, background: contentType === ct.val ? `${accent}10` : '#F8FAFC', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: contentType === ct.val ? accent : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <span style={{ fontSize: 14 }}>{ct.icon}</span> {ct.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic content fields based on type */}
                      {(contentType === 'text' || contentType === 'mixed') && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Text Content</div>
                          <textarea value={(w as any).text || ''} onChange={e => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, text: e.target.value } as any : x))}
                            placeholder="Enter your text, supports line breaks..."
                            rows={4} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: '#334155', background: '#F8FAFC' }} />
                        </div>
                      )}
                      {(contentType === 'image' || contentType === 'mixed') && (
                        <>
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Image URL</div>
                            <input value={(w as any).imageUrl || ''} onChange={e => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, imageUrl: e.target.value } as any : x))}
                              placeholder="https://example.com/image.png"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC' }} />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Caption (Optional)</div>
                            <input value={(w as any).caption || ''} onChange={e => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, caption: e.target.value } as any : x))}
                              placeholder="Image caption..."
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC' }} />
                          </div>
                        </>
                      )}
                      {(contentType === 'links' || contentType === 'mixed') && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Links</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                            {((w as any).links || []).map((link: any, i: number) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input value={link.title} onChange={e => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, links: (x as any).links.map((l: any, j: number) => j === i ? { ...l, title: e.target.value } : l) } as any : x))}
                                  placeholder="Link title" style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC' }} />
                                <input value={link.url} onChange={e => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, links: (x as any).links.map((l: any, j: number) => j === i ? { ...l, url: e.target.value } : l) } as any : x))}
                                  placeholder="https://..." style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC' }} />
                                <button onClick={() => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, links: (x as any).links.filter((_: any, j: number) => j !== i) } as any : x))}
                                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #FEE2E2', background: '#fff', cursor: 'pointer', color: '#EF4444', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, links: [...((x as any).links || []), { title: '', url: '', icon: '🔗' }] } as any : x))}
                            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px dashed #CBD5E1', background: '#F8FAFC', fontSize: 13, color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>
                            + Add Link
                          </button>
                        </div>
                      )}

                      {/* Scope */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Scope — Show On</div>
                        {[{ val: 'All Articles', desc: 'Widget appears on every article' }, { val: 'Specific Categories', desc: null }, { val: 'Specific Articles', desc: null }].map(opt => (
                          <div key={opt.val} onClick={() => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, scope: opt.val } : x))}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${w.scope === opt.val ? accent : '#E2E8F0'}`, background: w.scope === opt.val ? `${accent}08` : '#fff', marginBottom: 8, cursor: 'pointer' }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${w.scope === opt.val ? accent : '#CBD5E1'}`, background: w.scope === opt.val ? accent : '#fff', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {w.scope === opt.val && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{opt.val}</div>
                              {opt.desc && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{opt.desc}</div>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Widget Active toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', marginBottom: 18 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Widget Active</span>
                        <div onClick={() => setStickyWidgets(prev => prev.map(x => x.id === w.id ? { ...x, enabled: !x.enabled } : x))}
                          style={{ width: 48, height: 26, borderRadius: 13, background: w.enabled ? accent : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 3, left: w.enabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Live Preview</div>
                        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 }}>
                            Appears on Article Page ({(w as any).position === 'left' ? 'Left' : 'Right'} Side)
                          </div>
                          {(() => {
                            const col = COLORS.find(c => c.name === w.color) || COLORS[0]
                            return (
                              <div style={{ background: '#fff', border: `1px solid ${col.hex}30`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                                <div style={{ background: col.hex, padding: '8px 14px', fontSize: 13, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '.04em' }}>{w.name}</div>
                                <div style={{ padding: '10px 14px' }}>
                                  {(contentType === 'text' || contentType === 'mixed') && (w as any).text && (
                                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>{(w as any).text}</div>
                                  )}
                                  {(contentType === 'image' || contentType === 'mixed') && (w as any).imageUrl && (
                                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>📷 Image: {(w as any).imageUrl.slice(0, 40)}...</div>
                                  )}
                                  {(contentType === 'links' || contentType === 'mixed') && ((w as any).links || []).length > 0 && (
                                    <div style={{ marginTop: 6 }}>
                                      {((w as any).links || []).map((l: any, i: number) => (
                                        <div key={i} style={{ fontSize: 12, color: col.hex, fontWeight: 600, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span>🔗</span> {l.title || 'Link ' + (i + 1)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {!((w as any).text) && !((w as any).imageUrl) && !((w as any).links || []).length && (
                                    <div style={{ fontSize: 12, color: '#CBD5E1' }}>Add content above to see preview</div>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#94A3B8', padding: 24 }}>
                      <span style={{ fontSize: 48 }}>📌</span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#CBD5E1' }}>Select a widget to edit</div>
                      <div style={{ fontSize: 13 }}>or create a new one</div>
                      <button onClick={() => {
                        const id = 'w_' + Date.now()
                        setStickyWidgets(prev => [...prev, { id, name: 'New Widget', enabled: true, color: 'blue', position: 'right', contentType: 'text', text: '', imageUrl: '', caption: '', links: [], scope: 'All Articles' }])
                        setSelectedWidget(id)
                      }} style={{ marginTop: 8, padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create Widget</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              {w && (
                <div style={{ padding: '12px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button onClick={() => { setStickyWidgets(prev => prev.filter(x => x.id !== w.id)); setSelectedWidget(null) }}
                    style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #EF4444', background: '#fff', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => { setStickyOpen(false); setSelectedWidget(null) }}
                    style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => setStickyOpen(false)}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Widget</button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </>
  )
}
