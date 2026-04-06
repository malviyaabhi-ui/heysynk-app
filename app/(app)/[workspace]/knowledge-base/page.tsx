import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KBClient from './KBClient'

export default async function KBPage({ params }: { params: { workspace: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', params.workspace)
    .single()
  if (!workspace) redirect('/login')

  return <KBClient agent={agent} workspace={workspace} />
}
