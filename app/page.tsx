import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: agent } = await supabase
      .from('agents')
      .select('workspaces(slug)')
      .eq('user_id', user.id)
      .single()
    if (agent?.workspaces) {
      redirect(`/${(agent.workspaces as any).slug}/inbox`)
    }
  }

  redirect('/login')
}
