import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { context, customer_name, agent_name, workspace_id } = await request.json()

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are ${agent_name || 'a helpful support AI'}. Be friendly, concise, and helpful. Reply in 1-3 sentences only.`,
        messages: [{ role: 'user', content: context || 'Hello' }],
      })
    })

    const data = await res.json()
    const reply = data.content?.[0]?.text || 'Thanks for reaching out! Our team will get back to you shortly.'

    return NextResponse.json({ reply }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (e: any) {
    return NextResponse.json({ reply: 'Thanks for your message! Our team will get back to you shortly.' }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
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
