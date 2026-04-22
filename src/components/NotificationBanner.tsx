'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Share } from 'lucide-react'
import OneSignal from 'react-onesignal'

interface Props {
  userId: string
}

type State = 'loading' | 'subscribed' | 'ios-browser' | 'prompt' | 'denied' | 'unsupported'

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
}

let initialized = false

export default function NotificationBanner({ userId }: Props) {
  const [state, setState] = useState<State>('loading')
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('notif-banner-dismissed')
  )

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (!appId || !('Notification' in window)) {
      setState('unsupported')
      return
    }

    if (isIOS() && !isStandalone()) {
      setState('ios-browser')
      return
    }

    async function init() {
      if (!initialized) {
        initialized = true
        await OneSignal.init({
          appId: appId!,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false } as never,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
        })
        try {
          OneSignal.login(userId)
        } catch {}
      }

      if (Notification.permission === 'granted') {
        setState('subscribed')
      } else if (Notification.permission === 'denied') {
        setState('denied')
      } else {
        setState('prompt')
      }
    }

    init()
  }, [userId])

  async function handleEnable() {
    try {
      await OneSignal.Notifications.requestPermission()
      setState(Notification.permission === 'granted' ? 'subscribed' : 'denied')
    } catch {
      setState('denied')
    }
  }

  if (dismissed || state === 'loading' || state === 'subscribed' || state === 'unsupported') {
    return null
  }

  if (state === 'denied') {
    return null
  }

  if (state === 'ios-browser') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-sm">
        <Share className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-amber-200 flex-1 min-w-0">
          Tippe auf <strong>Teilen</strong> → <strong>Zum Home-Bildschirm</strong>, um Benachrichtigungen zu aktivieren.
        </p>
        <button onClick={() => { localStorage.setItem('notif-banner-dismissed', '1'); setDismissed(true) }} className="text-amber-400/60 hover:text-amber-400 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-sm">
      <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="text-amber-200 flex-1 min-w-0">Benachrichtigungen aktivieren, um neue Nachrichten nicht zu verpassen.</p>
      <button
        onClick={handleEnable}
        className="flex-shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold rounded-lg text-xs transition-colors"
      >
        Aktivieren
      </button>
      <button onClick={() => { localStorage.setItem('notif-banner-dismissed', '1'); setDismissed(true) }} className="text-amber-400/60 hover:text-amber-400 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
