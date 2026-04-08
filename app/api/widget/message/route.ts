import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { conversation_id, workspace_id, body, sender_type } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await supabase.from('messages').insert({
      conversation_id,
      workspace_id,
      sender_type: sender_type || 'contact',
      body,
      type: 'text',
    })

    await supabase.from('conversations').update({
      last_message: body,
      last_message_at: new Date().toISOString(),
    }).eq('id', conversation_id)

    return NextResponse.json({ success: true }, {
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
