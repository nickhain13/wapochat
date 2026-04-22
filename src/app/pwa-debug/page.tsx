'use client'

import { useEffect, useState } from 'react'

interface Status {
  https: boolean
  swSupported: boolean
  swRegistered: boolean | null
  swState: string | null
  manifestLinked: boolean
  manifestParsed: boolean | null
  manifestDisplay: string | null
  manifestIcons: number | null
  installPromptFired: boolean
  displayMode: string
  userAgent: string
}

export default function PwaDebugPage() {
  const [status, setStatus] = useState<Partial<Status>>({})
  const [log, setLog] = useState<string[]>([])

  function addLog(msg: string) {
    setLog(prev => [...prev, msg])
  }

  useEffect(() => {
    const s: Partial<Status> = {}

    s.https = location.protocol === 'https:' || location.hostname === 'localhost'
    s.swSupported = 'serviceWorker' in navigator
    s.userAgent = navigator.userAgent
    s.displayMode = window.matchMedia('(display-mode: standalone)').matches
      ? 'standalone (installiert!)'
      : window.matchMedia('(display-mode: minimal-ui)').matches
        ? 'minimal-ui'
        : 'browser'

    const manifestLink = document.querySelector('link[rel="manifest"]')
    s.manifestLinked = !!manifestLink
    addLog(manifestLink ? `Manifest link gefunden: ${manifestLink.getAttribute('href')}` : 'KEIN manifest link im HTML!')

    if (manifestLink) {
      fetch('/manifest.json')
        .then(r => r.json())
        .then(data => {
          setStatus(prev => ({
            ...prev,
            manifestParsed: true,
            manifestDisplay: data.display,
            manifestIcons: data.icons?.length ?? 0,
          }))
          addLog(`Manifest OK: display=${data.display}, icons=${data.icons?.length}`)
        })
        .catch(err => {
          setStatus(prev => ({ ...prev, manifestParsed: false }))
          addLog(`Manifest fetch Fehler: ${err}`)
        })
    }

    if (s.swSupported) {
      navigator.serviceWorker.getRegistration('/').then(reg => {
        setStatus(prev => ({
          ...prev,
          swRegistered: !!reg,
          swState: reg?.active?.state ?? reg?.installing?.state ?? reg?.waiting?.state ?? null,
        }))
        addLog(reg ? `SW registriert, state: ${reg.active?.state ?? 'kein active'}` : 'SW NICHT registriert!')
      })
    }

    const handler = () => {
      setStatus(prev => ({ ...prev, installPromptFired: true }))
      addLog('beforeinstallprompt Event gefeuert!')
    }
    window.addEventListener('beforeinstallprompt', handler)

    setTimeout(() => {
      setStatus(prev => ({ ...prev, installPromptFired: prev.installPromptFired ?? false }))
      if (!status.installPromptFired) addLog('Nach 5s: beforeinstallprompt NICHT gefeuert')
    }, 5000)

    setStatus(s)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dot(val: boolean | null | undefined) {
    if (val === null || val === undefined) return '⏳'
    return val ? '✅' : '❌'
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: 16, background: '#030712', color: '#e5e7eb', minHeight: '100vh', fontSize: 13 }}>
      <h1 style={{ color: '#f59e0b', marginBottom: 16 }}>PWA Debug</h1>

      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 20 }}>
        <tbody>
          {[
            ['HTTPS', dot(status.https), status.https ? 'ok' : 'FEHLER – kein HTTPS'],
            ['SW unterstützt', dot(status.swSupported), ''],
            ['SW registriert', dot(status.swRegistered), status.swState ?? ''],
            ['Manifest verlinkt', dot(status.manifestLinked), ''],
            ['Manifest lesbar', dot(status.manifestParsed), `display=${status.manifestDisplay}, icons=${status.manifestIcons}`],
            ['Install-Event', dot(status.installPromptFired), status.installPromptFired ? 'Ja!' : 'Noch nicht'],
            ['Display Mode', '📱', status.displayMode ?? ''],
          ].map(([label, icon, detail]) => (
            <tr key={label as string} style={{ borderBottom: '1px solid #1f2937' }}>
              <td style={{ padding: '6px 8px', color: '#9ca3af' }}>{label}</td>
              <td style={{ padding: '6px 8px', fontSize: 16 }}>{icon}</td>
              <td style={{ padding: '6px 8px', color: '#d1d5db', wordBreak: 'break-all' }}>{detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ color: '#f59e0b', marginBottom: 8, fontSize: 14 }}>Log</h2>
      <div style={{ background: '#111827', borderRadius: 8, padding: 12 }}>
        {log.length === 0 ? <span style={{ color: '#4b5563' }}>Wird geladen...</span> : log.map((l, i) => (
          <div key={i} style={{ marginBottom: 4, color: '#6ee7b7' }}>{l}</div>
        ))}
      </div>

      <details style={{ marginTop: 20 }}>
        <summary style={{ color: '#9ca3af', cursor: 'pointer' }}>User Agent</summary>
        <div style={{ color: '#4b5563', marginTop: 8, wordBreak: 'break-all' }}>{status.userAgent}</div>
      </details>
    </div>
  )
}
