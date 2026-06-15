import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface WaterLevelPayload {
  title?: string
  content?: string
  message?: string
}

async function getBotUserId(): Promise<string | null> {
  if (process.env.WATER_LEVEL_BOT_USER_ID) return process.env.WATER_LEVEL_BOT_USER_ID

  const botEmail = process.env.WATER_LEVEL_BOT_EMAIL
  if (!botEmail) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', botEmail)
    .single()

  return data?.id ?? null
}

export async function POST(request: Request) {
  const secret = process.env.WATER_LEVEL_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'WATER_LEVEL_WEBHOOK_SECRET ist nicht konfiguriert' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const groupId = process.env.WATER_LEVEL_GROUP_ID
  if (!groupId) {
    return NextResponse.json({ error: 'WATER_LEVEL_GROUP_ID ist nicht konfiguriert' }, { status: 500 })
  }

  const botUserId = await getBotUserId()
  if (!botUserId) {
    return NextResponse.json({ error: 'WATER_LEVEL_BOT_USER_ID oder WATER_LEVEL_BOT_EMAIL ist nicht konfiguriert' }, { status: 500 })
  }

  let payload: WaterLevelPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 })
  }

  const body = (payload.content || payload.message || '').trim()
  if (!body) return NextResponse.json({ error: 'Leere Wasserstand-Nachricht' }, { status: 400 })

  const title = (payload.title || '🌊 Bodensee-Pegel').trim()
  const content = `${title}\n\n${body}`
  const supabase = createAdminClient()

  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .single()

  if (!group) return NextResponse.json({ error: 'Wasserstand-Gruppe nicht gefunden' }, { status: 404 })

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      group_id: groupId,
      user_id: botUserId,
      content,
      is_approved: true,
      approved_by: botUserId,
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, messageId: message.id })
}
