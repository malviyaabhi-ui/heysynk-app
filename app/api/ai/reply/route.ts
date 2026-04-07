import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  try {
    const { context, customer_name, agent_name, workspace_id } = await request.json()

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are ${agent_name || 'a helpful support AI'}. Be friendly, concise, and helpful. Reply in 1-3 sentences only. Address the customer by name if provided.`,
      messages: [{ role: 'user', content: context || 'Hello' }],
    })

    const reply = message.content[0].type === 'text' ? message.content[0].text : 'Thanks for reaching out! Our team will get back to you shortly.'

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
