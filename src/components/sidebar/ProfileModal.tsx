'use client'

import { useState } from 'react'
import { X, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'

interface Props {
  currentUser: Profile
  onSaved: () => void
  onClose: () => void
}

export default function ProfileModal({ currentUser, onSaved, onClose }: Props) {
  const [name, setName] = useState(currentUser.display_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name.trim() })
      .eq('id', currentUser.id)

    if (error) {
      setError('Fehler beim Speichern.')
    } else {
      onSaved()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">Profil bearbeiten</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Anzeigename</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={40}
              placeholder="Dein Name"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">E-Mail</label>
            <p className="text-gray-500 text-sm px-3 py-2.5 bg-gray-800/50 rounded-lg">{currentUser.email}</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
