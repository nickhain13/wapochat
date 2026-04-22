'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' }).catch(() => {})
    }
  }, [])

  return null
}
