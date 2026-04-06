import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, welcomeTemplate } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { agent_id } = await req.json()
    if (!agent_id) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: agent } = await supabase
      .from('agents')
      .select('name, email, workspaces(name, slug)')
      .eq('id', agent_id)
      .single()

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const workspace = agent.workspaces as any
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`

    await sendEmail({
      to: agent.email,
      subject: `Welcome to ${workspace.name} on heySynk`,
      html: welcomeTemplate(agent.name, workspace.name, loginUrl),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
