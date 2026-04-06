'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Agent { id: string; name: string; email: string; role: string; workspace_id: string }
interface Workspace { id: string; name: string; slug: string; accent_color: string }
interface Category { id: string; name: string; slug: string; description: string; icon: string; color: string; position: number }
interface Article {
  id: string; title: string; slug: string; body: string; excerpt: string
  status: string; tags: string[]; category_id: string | null; author_id: string | null
  created_at: string; updated_at: string
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function timeAgo(ts: string) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const CAT_ICONS: Record<string, string> = {
  book:   'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  tool:   'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  bulb:   'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  lock:   'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  card:   'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  rocket: 'M13 10V3L4 14h7v7l9-11h-7z',
  chart:  'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  target: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  cog:    'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  doc:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
}

function CatIcon({ id, size = 15, color = '#94A3B8' }: { id: string; size?: number; color?: string }) {
  const d = CAT_ICONS[id] || CAT_ICONS.book
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default function KBClient({ agent, workspace }: { agent: Agent; workspace: Workspace }) {
  const supabase = createClient()
  const accent = workspace.accent_color || '#2563EB'

  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'edit' | 'new-cat'>('list')
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null)
  const [saving, setSaving] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('book')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('kb_categories').select('*')
      .eq('workspace_id', workspace.id).order('position')
    setCategories((data || []) as Category[])
  }, [workspace.id])

  const loadArticles = useCallback(async () => {
    let q = supabase.from('kb_articles').select('*').eq('workspace_id', workspace.id)
    if (activeCat) q = q.eq('category_id', activeCat)
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q.order('updated_at', { ascending: false })
    setArticles((data || []) as Article[])
  }, [workspace.id, activeCat, statusFilter])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadArticles() }, [loadArticles])

  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.excerpt || '').toLowerCase().includes(search.toLowerCase())
  )

  async function saveArticle() {
    if (!editingArticle?.title?.trim()) return
    setSaving(true)
    const payload = {
      workspace_id: workspace.id,
      title: editingArticle.title,
      slug: editingArticle.slug || slugify(editingArticle.title),
      body: editingArticle.body || '',
      excerpt: editingArticle.excerpt || (editingArticle.body || '').slice(0, 120),
      status: editingArticle.status || 'draft',
      category_id: editingArticle.category_id || null,
      author_id: agent.id,
      tags: editingArticle.tags || [],
    }
    if (editingArticle.id) {
      await supabase.from('kb_articles').update(payload).eq('id', editingArticle.id)
    } else {
      await supabase.from('kb_articles').insert(payload)
    }
    setSaving(false)
    setView('list')
    setEditingArticle(null)
    loadArticles()
  }

  async function deleteArticle(id: string) {
    if (!confirm('Delete this article?')) return
    await supabase.from('kb_articles').delete().eq('id', id)
    loadArticles()
  }

  async function toggleStatus(a: Article) {
    await supabase.from('kb_articles').update({ status: a.status === 'published' ? 'draft' : 'published' }).eq('id', a.id)
    loadArticles()
  }

  async function saveCategory() {
    if (!newCatName.trim()) return
    await supabase.from('kb_categories').insert({
      workspace_id: workspace.id,
      name: newCatName,
      slug: slugify(newCatName),
      description: newCatDesc,
      icon: newCatIcon,
      position: categories.length,
    })
    setNewCatName(''); setNewCatDesc(''); setNewCatIcon('book')
    setView('list')
    loadCategories()
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete category? Articles will become uncategorised.')) return
    await supabase.from('kb_categories').delete().eq('id', id)
    if (activeCat === id) setActiveCat(null)
    loadCategories(); loadArticles()
  }

  const catName = activeCat ? (categories.find(c => c.id === activeCat)?.name || 'Articles') : 'All Articles'

  /* ── EDITOR ── */
  if (view === 'edit' && editingArticle !== null) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => { setView('list'); setEditingArticle(null) }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div style={{ flex: 1 }} />
        <select value={editingArticle.status || 'draft'}
          onChange={e => setEditingArticle(p => ({ ...p, status: e.target.value }))}
          style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, border: '1.5px solid #E2E8F0', outline: 'none', cursor: 'pointer',
            color: editingArticle.status === 'published' ? '#16A34A' : '#CA8A04',
            background: editingArticle.status === 'published' ? '#DCFCE7' : '#FEF9C3' }}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select value={editingArticle.category_id || ''}
          onChange={e => setEditingArticle(p => ({ ...p, category_id: e.target.value || null }))}
          style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1.5px solid #E2E8F0', outline: 'none', cursor: 'pointer', color: '#334155' }}>
          <option value="">No category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={saveArticle} disabled={saving}
          style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : editingArticle.id ? 'Update' : 'Save'}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20%' }}>
        <input value={editingArticle.title || ''} placeholder="Article title…"
          onChange={e => setEditingArticle(p => ({ ...p, title: e.target.value }))}
          style={{ width: '100%', fontSize: 28, fontWeight: 800, color: '#0F172A', border: 'none', outline: 'none', marginBottom: 10, fontFamily: 'inherit' }} />
        <input value={editingArticle.excerpt || ''} placeholder="Short excerpt shown in search results…"
          onChange={e => setEditingArticle(p => ({ ...p, excerpt: e.target.value }))}
          style={{ width: '100%', fontSize: 14, color: '#64748B', border: 'none', outline: 'none', marginBottom: 24, fontFamily: 'inherit' }} />
        <div style={{ height: 1, background: '#F1F5F9', marginBottom: 28 }} />
        <textarea value={editingArticle.body || ''} placeholder="Write your article content here…"
          onChange={e => setEditingArticle(p => ({ ...p, body: e.target.value }))}
          style={{ width: '100%', minHeight: 500, fontSize: 15, color: '#334155', lineHeight: 1.9, border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
      </div>
    </div>
  )

  /* ── NEW CATEGORY MODAL ── */
  if (view === 'new-cat') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', height: '100%' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 24 }}>New Category</div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Icon</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.keys(CAT_ICONS).map(id => (
              <button key={id} onClick={() => setNewCatIcon(id)}
                style={{ width: 38, height: 38, borderRadius: 9, border: newCatIcon === id ? `2px solid ${accent}` : '2px solid #E2E8F0',
                  background: newCatIcon === id ? `${accent}12` : '#F8FAFC', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CatIcon id={id} size={16} color={newCatIcon === id ? accent : '#94A3B8'} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Name</div>
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Getting Started"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 14, color: '#0F172A', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Description</div>
          <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Optional description"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', fontSize: 14, color: '#0F172A', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setView('list')}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
          <button onClick={saveCategory}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create</button>
        </div>
      </div>
    </div>
  )

  /* ── LIST VIEW ── */
  return (
    <div style={{ display: 'flex', height: '100%', background: '#F8FAFC' }}>

      {/* Categories sidebar */}
      <div style={{ width: 220, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Categories</div>
          <button onClick={() => setView('new-cat')}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1.5px dashed ${accent}`, background: `${accent}08`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Category
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          <button onClick={() => setActiveCat(null)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
              background: activeCat === null ? `${accent}12` : 'transparent' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={activeCat === null ? accent : '#94A3B8'} strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: activeCat === null ? accent : '#334155' }}>All Articles</span>
          </button>
          {categories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', borderRadius: 8, background: activeCat === cat.id ? `${accent}12` : 'transparent', marginBottom: 2 }}>
              <button onClick={() => setActiveCat(cat.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left' }}>
                <CatIcon id={cat.icon || 'book'} size={15} color={activeCat === cat.id ? accent : '#94A3B8'} />
                <span style={{ fontSize: 13, fontWeight: 600, color: activeCat === cat.id ? accent : '#334155' }}>{cat.name}</span>
              </button>
              <button onClick={() => deleteCategory(cat.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 8px', color: '#CBD5E1' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{catName}</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{filtered.length} article{filtered.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '7px 12px', width: 200 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
            <input placeholder="Search articles…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#334155', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'published', 'draft'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  background: statusFilter === s ? accent : '#F1F5F9', color: statusFilter === s ? '#fff' : '#64748B' }}>{s}</button>
            ))}
          </div>
          <button onClick={() => { setEditingArticle({ status: 'draft', category_id: activeCat }); setView('edit') }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Article
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#94A3B8' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#CBD5E1', marginBottom: 8 }}>No articles yet</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>Create your first article to get started</div>
              <button onClick={() => { setEditingArticle({ status: 'draft', category_id: activeCat }); setView('edit') }}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Write first article
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map(article => {
              const cat = categories.find(c => c.id === article.category_id)
              return (
                <div key={article.id}
                  style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{article.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                        background: article.status === 'published' ? '#DCFCE7' : '#FEF9C3',
                        color: article.status === 'published' ? '#16A34A' : '#CA8A04' }}>
                        {article.status}
                      </span>
                    </div>
                    {article.excerpt && <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.excerpt}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {cat && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8' }}>
                          <CatIcon id={cat.icon || 'book'} size={11} color="#94A3B8" /> {cat.name}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#CBD5E1' }}>Updated {timeAgo(article.updated_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); toggleStatus(article) }}
                      title={article.status === 'published' ? 'Unpublish' : 'Publish'}
                      style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                      {article.status === 'published'
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setEditingArticle(article); setView('edit') }}
                      style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #E2E8F0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteArticle(article.id) }}
                      style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid #FEE2E2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
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
  )
}
