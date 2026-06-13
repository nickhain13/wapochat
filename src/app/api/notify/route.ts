import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

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

  const webhookPayload: WebhookPayload = await request.json()
  if (webhookPayload.type !== 'INSERT' || webhookPayload.table !== 'messages') {
    return NextResponse.json({ skipped: true })
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const { group_id, user_id, content, image_url } = webhookPayload.record
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
  const title = `${senderName} in ${group.icon} ${group.name}`
  const body = content || (image_url ? '📷 Bild' : 'Neue Nachricht')
  const url = process.env.NEXT_PUBLIC_APP_URL || '/'

  const recipientIds = members
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string) => !mutedIds.has(id))

  if (recipientIds.length === 0) return NextResponse.json({ skipped: true })

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', recipientIds)

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no subscriptions' })
  }

  const pushPayload = JSON.stringify({ title, body, url, tag: webhookPayload.record.id })

  const results = await Promise.allSettled(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushPayload,
        { urgency: 'high', TTL: 60 }
      )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ ok: true, sent, failed })
}
