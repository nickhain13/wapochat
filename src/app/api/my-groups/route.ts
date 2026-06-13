import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Bearer-Token zuerst versuchen, dann Cookie-Fallback
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

  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: memberRows }, { data: profile }] = await Promise.all([
    admin.from('group_members').select('group_id, joined_at').eq('user_id', userId).order('joined_at', { ascending: true }),
    admin.from('profiles').select('*').eq('id', userId).single(),
  ])

  const groupIds = memberRows?.map((r: { group_id: string }) => r.group_id) ?? []

  const { data: groups } = groupIds.length > 0
    ? await admin.from('groups').select('*').in('id', groupIds)
    : { data: [] }

  // Reihenfolge nach joined_at erhalten
  const ordered = groupIds
    .map((id: string) => groups?.find((g: { id: string }) => g.id === id))
    .filter(Boolean)

  return NextResponse.json({ groups: ordered, profile: profile ?? null })
}
