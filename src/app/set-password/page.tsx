'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Film } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.updateUser({ password })
    if (authError || !user) {
      setError('Fehler beim Speichern. Bitte versuche es erneut.')
      setLoading(false)
      return
    }

    if (displayName.trim()) {
      await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id)
    }

    router.push('/')
    router.refresh()
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
          <form onSubmit={handleSubmit}>
            <h2 className="text-white font-semibold mb-1">Willkommen bei WaPoChat</h2>
            <p className="text-gray-500 text-sm mb-5">Gib deinen Namen ein und wähle ein Passwort.</p>

            <label className="block text-gray-400 text-sm mb-1.5">Dein Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              maxLength={40}
              placeholder="z.B. Anna Müller"
              autoFocus
              autoComplete="name"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
            />

            <label className="block text-gray-400 text-sm mb-1.5">Passwort *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              required
              autoComplete="new-password"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
            />

            <label className="block text-gray-400 text-sm mb-1.5">Passwort bestätigen</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
            />

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Speichern...' : 'Passwort speichern'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
