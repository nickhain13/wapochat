'use client'

import { useState } from 'react'
import { Plus, UserPlus, LogOut, Film, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Group, Profile } from '@/types'
import Avatar from '@/components/ui/Avatar'
import CreateGroupModal from './CreateGroupModal'
import InviteModal from './InviteModal'
import { useRouter } from 'next/navigation'

interface Props {
  groups: Group[]
  currentUser: Profile
  selectedGroupId: string | null
  onSelectGroup: (group: Group) => void
  onGroupsChanged: () => void
}

export default function Sidebar({ groups, currentUser, selectedGroupId, onSelectGroup, onGroupsChanged }: Props) {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const isAdmin = currentUser.role === 'admin'
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-1.5 rounded-lg">
              <Film className="w-4 h-4 text-gray-950" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-none">WaPoChat</h1>
              <p className="text-gray-500 text-xs">Filmproduktion</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Gruppen</span>
            {isAdmin && (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="text-gray-600 hover:text-amber-400 transition-colors"
                title="Gruppe erstellen"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                selectedGroupId === group.id
                  ? 'bg-amber-500/15 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-lg w-7 text-center flex-shrink-0">{group.icon}</span>
              <span className="text-sm font-medium truncate">{group.name}</span>
            </button>
          ))}

          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Hash className="w-8 h-8 text-gray-700 mb-2" />
              <p className="text-gray-600 text-xs">
                {isAdmin ? 'Erstelle deine erste Gruppe' : 'Noch keine Gruppen'}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-800 space-y-1">
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-left"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span className="text-sm">Person einladen</span>
            </button>
          )}

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <Avatar name={currentUser.display_name || currentUser.email} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentUser.display_name || currentUser.email.split('@')[0]}</p>
              <p className="text-gray-500 text-xs truncate">{isAdmin ? 'Admin' : 'Mitglied'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
              title="Abmelden"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          userId={currentUser.id}
          onClose={() => setShowCreateGroup(false)}
          onCreated={onGroupsChanged}
        />
      )}

      {showInvite && (
        <InviteModal
          groups={groups}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  )
}
