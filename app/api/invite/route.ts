import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { name, email, password, role, workspace_id, workspace_slug } = await request.json()

    if (!name || !email || !password || !workspace_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use service role to create user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, workspace_slug }
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Insert into agents table
    const { error: agentError } = await supabaseAdmin.from('agents').insert({
      id: authData.user.id,
      workspace_id,
      name,
      email,
      role,
      status: 'active',
    })

    if (agentError) return NextResponse.json({ error: agentError.message }, { status: 400 })

    return NextResponse.json({ success: true, user_id: authData.user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
