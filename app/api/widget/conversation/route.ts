import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { workspace_id, name, email, message, session_id } = await request.json()

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create or find contact
    let contactId = null
    if (email) {
      const { data: existing } = await supabase.from('contacts').select('id').eq('workspace_id', workspace_id).eq('email', email).single()
      if (existing) {
        contactId = existing.id
      } else {
        const { data: newContact } = await supabase.from('contacts').insert({ workspace_id, name: name || 'Visitor', email, status: 'active' }).select().single()
        if (newContact) contactId = newContact.id
      }
    }

    // Create conversation
    const { data: conv } = await supabase.from('conversations').insert({
      workspace_id,
      contact_id: contactId,
      status: 'open',
      channel: 'live_chat',
      priority: 'normal',
      last_message: message,
      last_message_at: new Date().toISOString(),
    }).select().single()

    if (!conv) return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })

    // Insert first message
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      workspace_id,
      sender_type: 'contact',
      body: message,
      type: 'text',
    })

    return NextResponse.json({ conversation_id: conv.id }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
