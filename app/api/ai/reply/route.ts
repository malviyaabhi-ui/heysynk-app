import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { context, customer_name, agent_name } = await req.json()
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        system: `You are Mira, a customer support AI. Agent name: ${agent_name}. Write a professional, friendly reply to the customer. Return ONLY the reply text.`,
        messages: [{ role: 'user', content: `Customer: ${customer_name}\n\nConversation:\n${context}\n\nWrite the agent reply:` }],
      }),
    })
    const data = await res.json()
    return NextResponse.json({ reply: data.content?.[0]?.text || '' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
