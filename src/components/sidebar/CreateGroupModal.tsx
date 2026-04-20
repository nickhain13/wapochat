'use client'

import { useState } from 'react'
import { X, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Group } from '@/types'

const ICONS = ['🎬', '🎭', '🚗', '🏠', '💡', '🎵', '📦', '👔', '🔧', '📷', '🎨', '✈️', '🌿', '💄', '🎪']

interface Props {
  userId: string
  parentGroup: Group | null
  allGroups: Group[]
  onClose: () => void
  onCreated: () => void
}

export default function CreateGroupModal({ userId, parentGroup, allGroups, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🎬')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const depth = parentGroup
    ? (allGroups.find(g => g.id === parentGroup.parent_id) ? 2 : 1)
    : 0

  const label = depth === 0 ? 'Gruppe' : depth === 1 ? 'Untergruppe' : 'Unter-Untergruppe'

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data: group, error: insertError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        parent_id: parentGroup?.id || null,
        created_by: userId,
      })
      .select()
      .single()

    if (insertError) {
      setError(`Fehler: ${insertError.message}`)
      setLoading(false)
      return
    }

    if (group) {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
      onCreated()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-white font-semibold">Neue {label}</h2>
              {parentGroup && (
                <p className="text-gray-500 text-xs">in {parentGroup.icon} {parentGroup.name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-colors ${
                    icon === i ? 'bg-amber-500/30 ring-2 ring-amber-500' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder={`z.B. ${depth === 0 ? 'Requisiten' : depth === 1 ? 'Fahrzeuge' : 'Oldtimer'}`}
              maxLength={50}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Beschreibung (optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Worum geht es hier?"
              maxLength={100}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Erstelle...' : `${label} erstellen`}
          </button>
        </form>
      </div>
    </div>
  )
}
