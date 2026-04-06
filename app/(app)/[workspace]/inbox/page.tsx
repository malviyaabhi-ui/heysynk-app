import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InboxClient from './InboxClient'

export default async function InboxPage({ params }: { params: { workspace: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, email, role, workspace_id, workspaces(id, name, slug, accent_color)')
    .eq('user_id', user.id)
    .single()

  if (!agent) redirect('/login')

  const workspace = agent.workspaces as any
  if (workspace?.slug !== params.workspace) redirect('/login')

  return (
    <InboxClient
      agent={{ id: agent.id, name: agent.name, email: agent.email, role: agent.role, workspace_id: agent.workspace_id }}
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug, accent_color: workspace.accent_color }}
    />
  )
}
