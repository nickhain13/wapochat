import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet', status: 401 as const, supabase: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Keine Berechtigung', status: 403 as const, supabase: null }

  return { error: null, status: 200 as const, supabase }
}

export async function GET() {
  const { error, status, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status })

  const [{ data: users }, { data: groups }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('*').order('display_name'),
    supabase.from('groups').select('*').order('name'),
    supabase.from('group_members').select('user_id, group_id'),
  ])

  return NextResponse.json({
    users: users || [],
    groups: groups || [],
    memberships: memberships || [],
  })
}

export async function POST(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status })

  const { userId, groupId } = await request.json()
  if (!userId || !groupId) return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 })

  const { error: insertError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const groupId = searchParams.get('groupId')

  if (!userId || !groupId) return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 })

  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
