import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function requireAdmin(request: Request) {
  // Try Bearer token first (iOS PWA doesn't reliably send auth cookies)
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

  // Fallback auf Cookie-Auth wenn Bearer fehlt oder abgelaufen ist
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

export async function GET(request: Request) {
  const result = await requireAdmin(request)
  if (result.error || !result.admin) return NextResponse.json({ error: result.error }, { status: result.status })
  const { admin } = result

  const [{ data: users }, { data: groups }, { data: memberships }] = await Promise.all([
    admin.from('profiles').select('*').order('display_name'),
    admin.from('groups').select('*').order('name'),
    admin.from('group_members').select('user_id, group_id'),
  ])

  return NextResponse.json({ users: users || [], groups: groups || [], memberships: memberships || [] })
}

export async function POST(request: Request) {
  const result = await requireAdmin(request)
  if (result.error || !result.admin) return NextResponse.json({ error: result.error }, { status: result.status })

  const { userId, groupId } = await request.json()
  if (!userId || !groupId) return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 })

  const { error } = await result.admin
    .from('group_members')
    .upsert({ group_id: groupId, user_id: userId }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const result = await requireAdmin(request)
  if (result.error || !result.admin) return NextResponse.json({ error: result.error }, { status: result.status })

  const { userId, role } = await request.json()
  if (!userId || !['regie', 'member'].includes(role))
    return NextResponse.json({ error: 'Ungültige Parameter' }, { status: 400 })

  const { error } = await result.admin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .neq('role', 'admin')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const result = await requireAdmin(request)
  if (result.error || !result.admin) return NextResponse.json({ error: result.error }, { status: result.status })

  const { userId, groupId } = await request.json()
  if (!userId || !groupId) return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 })

  const { error } = await result.admin
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
