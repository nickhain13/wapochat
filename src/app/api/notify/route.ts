import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    group_id: string
    user_id: string
    content: string | null
    image_url: string | null
    is_approved: boolean
  }
}

export async function POST(request: Request) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET
  if (secret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const payload: WebhookPayload = await request.json()
  if (payload.type !== 'INSERT' || payload.table !== 'messages') {
    return NextResponse.json({ skipped: true })
  }

  const { group_id, user_id, content, image_url } = payload.record
  const supabase = createAdminClient()

  const [{ data: sender }, { data: group }, { data: members }, { data: mutes }] = await Promise.all([
    supabase.from('profiles').select('display_name, email').eq('id', user_id).single(),
    supabase.from('groups').select('name, icon').eq('id', group_id).single(),
    supabase.from('group_members').select('user_id').eq('group_id', group_id).neq('user_id', user_id),
    supabase.from('notification_mutes').select('user_id').eq('group_id', group_id),
  ])

  if (!sender || !group || !members || members.length === 0) {
    return NextResponse.json({ skipped: true })
  }

  const mutedIds = new Set(mutes?.map((m: { user_id: string }) => m.user_id) || [])
  const senderName = sender.display_name || sender.email.split('@')[0]
  const notifTitle = `${senderName} in ${group.icon} ${group.name}`
  const notifBody = content || (image_url ? '📷 Bild' : 'Neue Nachricht')
  const recipientIds = members
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string) => !mutedIds.has(id))

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      include_aliases: { external_id: recipientIds },
      target_channel: 'push',
      headings: { en: notifTitle, de: notifTitle },
      contents: { en: notifBody, de: notifBody },
      url: process.env.NEXT_PUBLIC_APP_URL || '/',
    }),
  })

  const result = await res.json()
  return NextResponse.json({ ok: true, onesignal: result })
}
