import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, csatTemplate } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { conversation_id } = await req.json()
    if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: conv } = await supabase
      .from('conversations')
      .select(`
        id,
        contacts(name, email),
        agents!assigned_to(name)
      `)
      .eq('id', conversation_id)
      .single()

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const contact = conv.contacts as any
    const agent = conv.agents as any

    if (!contact?.email) {
      return NextResponse.json({ error: 'No customer email on file' }, { status: 400 })
    }

    const csatUrl = `${process.env.NEXT_PUBLIC_APP_URL}/csat?conversation=${conversation_id}`

    await sendEmail({
      to: contact.email,
      subject: 'How did we do? Quick feedback request',
      html: csatTemplate(
        contact.name || 'there',
        agent?.name || 'our team',
        csatUrl
      ),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
