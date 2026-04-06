import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, agentNotificationTemplate } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, agent_id } = await req.json()
    if (!conversation_id || !agent_id) {
      return NextResponse.json({ error: 'conversation_id and agent_id required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const [{ data: conv }, { data: agent }] = await Promise.all([
      supabase
        .from('conversations')
        .select('last_message, contacts(name), workspaces(slug)')
        .eq('id', conversation_id)
        .single(),
      supabase
        .from('agents')
        .select('name, email')
        .eq('id', agent_id)
        .single(),
    ])

    if (!conv || !agent?.email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const contact = conv.contacts as any
    const workspace = conv.workspaces as any
    const openUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${workspace.slug}/inbox?conversation=${conversation_id}`

    await sendEmail({
      to: agent.email,
      subject: `New conversation assigned — ${contact?.name || 'Customer'}`,
      html: agentNotificationTemplate(
        agent.name,
        conv.last_message || 'No preview available',
        contact?.name || 'Customer',
        openUrl
      ),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
