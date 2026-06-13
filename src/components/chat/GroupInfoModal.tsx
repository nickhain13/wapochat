'use client'

import { X, Users } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { Group, Profile } from '@/types'

interface Props {
  group: Group
  members: Profile[]
  onClose: () => void
}

function getDisplayName(profile: Profile) {
  return profile.display_name || profile.email.split('@')[0]
}

function getRoleLabel(role: Profile['role']) {
  if (role === 'admin') return 'Admin'
  if (role === 'regie') return 'Regie'
  return 'Mitglied'
}

export default function GroupInfoModal({ group, members, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl flex-shrink-0">{group.icon}</span>
            <div className="min-w-0">
              <h2 className="text-white font-semibold truncate">{group.name}</h2>
              <p className="text-gray-500 text-xs">{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {group.description && (
          <div className="px-5 py-4 border-b border-gray-800">
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{group.description}</p>
          </div>
        )}

        <div className="p-5 flex items-center gap-2 border-b border-gray-800">
          <Users className="w-4 h-4 text-amber-400" />
          <h3 className="text-white text-sm font-semibold">Mitglieder</h3>
        </div>

        <div className="overflow-y-auto p-3 space-y-1" style={{ scrollbarWidth: 'none' }}>
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-800/70">
              <Avatar name={getDisplayName(member)} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{getDisplayName(member)}</p>
                <p className="text-gray-500 text-xs truncate">{member.email}</p>
              </div>
              <span className="text-gray-500 text-xs flex-shrink-0">{getRoleLabel(member.role)}</span>
            </div>
          ))}

          {members.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">Keine Mitglieder</p>
          )}
        </div>
      </div>
    </div>
  )
}
