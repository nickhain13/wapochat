import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getUserId(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await client.auth.getUser()
    if (user?.id) return user.id
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'Fehlende Gruppe' }, { status: 400 })

  const admin = createAdminClient()

  const [{ data: profile }, { data: membership }, { data: group }] = await Promise.all([
    admin.from('profiles').select('role').eq('id', userId).single(),
    admin.from('group_members').select('group_id').eq('group_id', groupId).eq('user_id', userId).maybeSingle(),
    admin.from('groups').select('*').eq('id', groupId).maybeSingle(),
  ])

  if (!group) return NextResponse.json({ error: 'Gruppe nicht gefunden' }, { status: 404 })
  if (profile?.role !== 'admin' && !membership) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  const { data: memberRows, error } = await admin
    .from('group_members')
    .select('user_id, profiles(*)')
    .eq('group_id', groupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = (memberRows || [])
    .map((row) => Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)
    .filter(Boolean)
    .sort((a, b) => {
      const nameA = a.display_name || a.email || ''
      const nameB = b.display_name || b.email || ''
      return nameA.localeCompare(nameB, 'de')
    })

  return NextResponse.json({ group, members })
}
