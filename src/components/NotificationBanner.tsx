'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Share } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
}

export default function NotificationBanner() {
  const { permission, subscribed, loading, subscribe, supported } = usePushNotifications()
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('notif-banner-dismissed')
  )
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    if (supported && isIOS() && !isStandalone()) {
      queueMicrotask(() => setShowIOSHint(true))
    }
  }, [supported])

  function dismiss() {
    localStorage.setItem('notif-banner-dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || !supported || subscribed || permission === 'denied') return null

  if (showIOSHint) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-sm">
        <Share className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-amber-200 flex-1 min-w-0">
          Tippe auf <strong>Teilen</strong> → <strong>Zum Home-Bildschirm</strong>, um Benachrichtigungen zu aktivieren.
        </p>
        <button onClick={dismiss} className="text-amber-400/60 hover:text-amber-400 flex-shrink-0">
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
        onClick={subscribe}
        disabled={loading}
        className="flex-shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
      >
        Aktivieren
      </button>
      <button onClick={dismiss} className="text-amber-400/60 hover:text-amber-400 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
