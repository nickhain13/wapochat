import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getAuthUser(request: Request): Promise<string | null> {
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
  const userId = await getAuthUser(request)
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')
  if (!groupId) return NextResponse.json({ error: 'Fehlende groupId' }, { status: 400 })

  const admin = createAdminClient()

  // Prüfen ob User Mitglied der Gruppe ist
  const { data: membership } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (!membership) return NextResponse.json({ error: 'Kein Mitglied dieser Gruppe' }, { status: 403 })

  const { data: messages, error } = await admin
    .from('messages')
    .select(`*, profiles!messages_user_id_fkey(*), reactions(*)`)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: messages || [] })
}

export async function POST(request: Request) {
  const userId = await getAuthUser(request)
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const { groupId, content, imageUrl } = await request.json()
  if (!groupId) return NextResponse.json({ error: 'Fehlende groupId' }, { status: 400 })
  if (!content?.trim() && !imageUrl) return NextResponse.json({ error: 'Leere Nachricht' }, { status: 400 })

  const admin = createAdminClient()

  // Prüfen ob User Mitglied der Gruppe ist
  const { data: membership } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (!membership) return NextResponse.json({ error: 'Kein Mitglied dieser Gruppe' }, { status: 403 })

  const { data: message, error } = await admin
    .from('messages')
    .insert({
      group_id: groupId,
      user_id: userId,
      content: content?.trim() || null,
      image_url: imageUrl || null,
    })
    .select(`*, profiles!messages_user_id_fkey(*), reactions(*)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message })
}
