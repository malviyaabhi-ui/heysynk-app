import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, passwordResetTemplate } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const supabase = createServiceClient()

    // Get agent name
    const { data: agent } = await supabase
      .from('agents')
      .select('name')
      .eq('email', email)
      .single()

    // Create reset token
    const { data: reset } = await supabase
      .from('password_resets')
      .insert({ email })
      .select('token')
      .single()

    if (!reset) return NextResponse.json({ error: 'Failed to create reset token' }, { status: 500 })

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${reset.token}`

    await sendEmail({
      to: email,
      subject: 'Reset your heySynk password',
      html: passwordResetTemplate(agent?.name || 'there', resetUrl),
    })

    // Always return success (don't reveal if email exists)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
