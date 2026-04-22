'use client'

import { useState, useEffect } from 'react'
import { X, Users, Check, Loader2 } from 'lucide-react'
import { Group, Profile } from '@/types'
import Avatar from '@/components/ui/Avatar'

interface MemberData {
  profile: Profile
  groupIds: Set<string>
}

interface Props {
  onClose: () => void
}

function getGroupLabel(group: Group, allGroups: Group[]): string {
  if (!group.parent_id) return group.name
  const parent = allGroups.find(g => g.id === group.parent_id)
  return parent ? `${parent.name} › ${group.name}` : group.name
}

export default function MembersModal({ onClose }: Props) {
  const [members, setMembers] = useState<MemberData[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const res = await fetch('/api/group-members')
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    const memberMap = new Map<string, Set<string>>()
    data.users.forEach((u: Profile) => memberMap.set(u.id, new Set()))
    data.memberships.forEach((m: { user_id: string; group_id: string }) => {
      memberMap.get(m.user_id)?.add(m.group_id)
    })

    const memberList: MemberData[] = data.users.map((u: Profile) => ({
      profile: u,
      groupIds: memberMap.get(u.id) || new Set(),
    }))

    setMembers(memberList)
    setGroups(data.groups)
    if (memberList.length > 0) setSelectedUserId(memberList[0].profile.id)
    setLoading(false)
  }

  async function toggleMembership(userId: string, groupId: string, isMember: boolean) {
    const key = `${userId}-${groupId}`
    setSaving(prev => new Set(prev).add(key))

    const res = await fetch(
      isMember ? `/api/group-members?userId=${userId}&groupId=${groupId}` : '/api/group-members',
      {
        method: isMember ? 'DELETE' : 'POST',
        headers: isMember ? undefined : { 'Content-Type': 'application/json' },
        body: isMember ? undefined : JSON.stringify({ userId, groupId }),
      }
    )

    const data = await res.json()
    if (!data.error) {
      setMembers(prev =>
        prev.map(m => {
          if (m.profile.id !== userId) return m
          const next = new Set(m.groupIds)
          isMember ? next.delete(groupId) : next.add(groupId)
          return { ...m, groupIds: next }
        })
      )
    }

    setSaving(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const selectedMember = members.find(m => m.profile.id === selectedUserId)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">Mitglieder verwalten</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Personenliste */}
            <div className="w-52 border-r border-gray-800 overflow-y-auto flex-shrink-0">
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-2">
                Personen
              </p>
              {members.map(m => (
                <button
                  key={m.profile.id}
                  onClick={() => setSelectedUserId(m.profile.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    selectedUserId === m.profile.id
                      ? 'bg-amber-500/15 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Avatar name={m.profile.display_name || m.profile.email} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {m.profile.display_name || m.profile.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-600">
                      {m.groupIds.size} Gruppe{m.groupIds.size !== 1 ? 'n' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Gruppen-Checkboxen */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedMember ? (
                <>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
                    Gruppen von{' '}
                    {selectedMember.profile.display_name ||
                      selectedMember.profile.email.split('@')[0]}
                  </p>
                  {groups.length === 0 ? (
                    <p className="text-gray-600 text-sm">Keine Gruppen vorhanden</p>
                  ) : (
                    <div className="space-y-1">
                      {groups.map(g => {
                        const isMember = selectedMember.groupIds.has(g.id)
                        const key = `${selectedMember.profile.id}-${g.id}`
                        const isSaving = saving.has(key)

                        return (
                          <button
                            key={g.id}
                            onClick={() =>
                              !isSaving &&
                              toggleMembership(selectedMember.profile.id, g.id, isMember)
                            }
                            disabled={isSaving}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                              isMember
                                ? 'bg-amber-500/10 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                                isMember ? 'bg-amber-500' : 'border border-gray-600'
                              }`}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3 h-3 animate-spin text-gray-950" />
                              ) : isMember ? (
                                <Check className="w-3 h-3 text-gray-950" />
                              ) : null}
                            </div>
                            <span className="text-base flex-shrink-0">{g.icon}</span>
                            <span className="text-sm font-medium truncate">
                              {getGroupLabel(g, groups)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 text-sm pt-2">Person auswählen</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
