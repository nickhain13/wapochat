import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let userId: string | null = null

  if (token) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await client.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) return { error: 'Nicht angemeldet', status: 401 as const }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single()
  if (profile?.role !== 'admin') return { error: 'Keine Berechtigung', status: 403 as const }

  return { error: null, status: 200 as const, admin, userId }
}

export async function DELETE(request: Request) {
  const result = await requireAdmin(request)
  if (result.error || !result.admin) return NextResponse.json({ error: result.error }, { status: result.status })

  const { groupId } = await request.json()
  if (!groupId) return NextResponse.json({ error: 'Fehlende Gruppe' }, { status: 400 })

  const { error } = await result.admin
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
