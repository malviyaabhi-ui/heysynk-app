'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function avatarColor(name: string) {
  const colors = ['#2563EB','#7C3AED','#059669','#DC2626','#D97706','#0891B2']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

interface Props {
  conv: any
  agent: any
  workspace: any
  accent: string
  onClose: () => void
}

export default function ConvRightPanel({ conv, agent, workspace, accent, onClose }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<'info'|'history'|'notes'>('info')
  const [priority, setPriority] = useState(conv?.priority || 'normal')
  const [label, setLabel] = useState(conv?.label || '')
  const [note, setNote] = useState(conv?.sticky_note || '')
  const [noteSaved, setNoteSaved] = useState(false)

  async function updatePriority(p: string) {
    setPriority(p)
    await supabase.from('conversations').update({ priority: p }).eq('id', conv.id)
  }

  async function updateLabel(l: string) {
    setLabel(l)
    await supabase.from('conversations').update({ label: l }).eq('id', conv.id)
  }

  async function saveNote() {
    await supabase.from('conversations').update({ sticky_note: note }).eq('id', conv.id)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const contact = conv?.contacts

  return (
    <div style={{ width: 280, background: '#fff', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Details</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Contact card */}
      <div style={{ padding: '16px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarColor(contact?.name || 'V'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 auto 10px' }}>
          {initials(contact?.name || 'V')}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>{contact?.name || 'Unknown'}</div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>{contact?.email || 'No email'}</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {contact?.company && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F1F5F9', color: '#64748B' }}>{contact.company}</span>}
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F1F5F9', color: '#64748B' }}>{conv?.channel || 'Live Chat'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        {(['info','history','notes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '9px 0', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: tab === t ? accent : '#64748B', borderBottom: tab === t ? `2px solid ${accent}` : '2px solid transparent', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Info tab */}
      {tab === 'info' && (
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Conversation</div>

          {/* Priority */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Priority</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {['urgent','high','normal','low'].map(p => {
                const colors: Record<string,string> = { urgent:'#EF4444', high:'#F59E0B', normal: accent, low:'#94A3B8' }
                const bgs: Record<string,string> = { urgent:'#FEE2E2', high:'#FEF3C7', normal:`${accent}15`, low:'#F1F5F9' }
                const active = priority === p
                return (
                  <button key={p} onClick={() => updatePriority(p)}
                    style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1.5px solid ${active ? colors[p] : '#E2E8F0'}`, background: active ? bgs[p] : '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: active ? colors[p] : '#94A3B8', textTransform: 'capitalize' }}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Label */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Label</div>
            <select value={label} onChange={e => updateLabel(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#334155' }}>
              <option value="">No label</option>
              {['Billing','Technical','Refund','Shipping','Feature Request','Bug','Feedback','General'].map(l => (
                <option key={l} value={l.toLowerCase()}>{l}</option>
              ))}
            </select>
          </div>

          {/* Assigned to */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Assigned to</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials(agent.name)}</div>
              <span style={{ fontSize: 12, color: '#334155' }}>{agent.name}</span>
              <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto' }}>You</span>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Contact Info</div>
          {[
            { label: 'Location', value: contact?.location || 'Unknown' },
            { label: 'Company', value: contact?.company || 'Unknown' },
            { label: 'Status', value: contact?.status || 'Active' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F8FAFC' }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Previous Conversations</div>
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            This is the first conversation
          </div>
        </div>
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Sticky Note</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: -6 }}>Private — only visible to agents</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a private note about this contact..."
            rows={7} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: '#334155', boxSizing: 'border-box' }} />
          <button onClick={saveNote}
            style={{ padding: '9px', borderRadius: 8, border: 'none', background: noteSaved ? '#16A34A' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
            {noteSaved ? '✓ Saved' : 'Save Note'}
          </button>
        </div>
      )}
    </div>
  )
}
