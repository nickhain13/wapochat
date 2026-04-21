'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Film } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'reset'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/set-password`,
      })
      if (error) {
        setError('Fehler beim Senden. Bitte versuche es erneut.')
      } else {
        setSent(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('E-Mail oder Passwort falsch.')
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-amber-500 p-3 rounded-xl">
            <Film className="w-7 h-7 text-gray-950" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold">WaPoChat</h1>
            <p className="text-gray-500 text-sm">Filmproduktion</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="text-white font-semibold mb-2">Link gesendet!</h2>
              <p className="text-gray-400 text-sm">
                Schau in dein Postfach bei <span className="text-amber-400">{email}</span> und klicke auf den Link.
              </p>
              <button
                onClick={() => { setSent(false); setMode('login') }}
                className="mt-4 text-amber-400 text-sm hover:text-amber-300 transition-colors"
              >
                Zurück zur Anmeldung
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-white font-semibold mb-1">
                {mode === 'login' ? 'Anmelden' : 'Passwort zurücksetzen'}
              </h2>
              <p className="text-gray-500 text-sm mb-5">
                {mode === 'login'
                  ? 'Melde dich mit E-Mail und Passwort an.'
                  : 'Du bekommst einen Reset-Link per E-Mail.'}
              </p>

              <label className="block text-gray-400 text-sm mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
              />

              {mode === 'login' && (
                <>
                  <label className="block text-gray-400 text-sm mb-1.5">Passwort</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
                  />
                </>
              )}

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                {loading ? 'Bitte warten...' : mode === 'login' ? 'Anmelden' : 'Reset-Link senden'}
              </button>

              <div className="text-center mt-4">
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError('') }}
                    className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
                  >
                    Passwort vergessen?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError('') }}
                    className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
                  >
                    Zurück zur Anmeldung
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          Nur eingeladene Personen können sich anmelden.
        </p>
      </div>
    </div>
  )
}
