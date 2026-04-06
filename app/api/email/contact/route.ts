import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, contactFormTemplate } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    await sendEmail({
      to: process.env.FROM_EMAIL!,
      subject: `New contact form message from ${name}`,
      html: contactFormTemplate(name, email, message),
      replyTo: email,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
