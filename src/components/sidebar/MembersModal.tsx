'use client'

import { useState, useEffect } from 'react'
import { X, Users, Check, Loader2, ChevronLeft, Clapperboard } from 'lucide-react'
import { Group, Profile } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'

interface MemberData {
  profile: Profile
  groupIds: Set<string>
}

function getGroupLabel(group: Group, allGroups: Group[]): string {
  if (!group.parent_id) return group.name
  const parent = allGroups.find(g => g.id === group.parent_id)
  return parent ? `${parent.name} › ${group.name}` : group.name
}

export default function MembersModal({ onClose }: { onClose: () => void }) {
  const [members, setMembers] = useState<MemberData[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [roleChanging, setRoleChanging] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/group-members', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || `Ladefehler ${res.status}`)
        return
      }
      const { users, groups: grps, memberships } = await res.json()

      const memberMap = new Map<string, Set<string>>()
      users.forEach((u: Profile) => memberMap.set(u.id, new Set()))
      memberships.forEach((m: { user_id: string; group_id: string }) => {
        memberMap.get(m.user_id)?.add(m.group_id)
      })

      const memberList: MemberData[] = users.map((u: Profile) => ({
        profile: u,
        groupIds: memberMap.get(u.id) || new Set(),
      }))

      setMembers(memberList)
      setGroups(grps || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verbindungsfehler')
    } finally {
      setLoading(false)
    }
  }

  async function toggleMembership(userId: string, groupId: string, isMember: boolean) {
    const key = `${userId}-${groupId}`
    setSaving(key)
    setError('')
    try {
      const supabase = createClient()
      // getUser() stellt sicher dass der Token frisch ist (löst automatisch Refresh aus)
      await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/group-members', {
        method: isMember ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, groupId }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || `Serverfehler ${res.status}`)
        return
      }

      const json = await res.json()
      if (json.error) { setError(json.error); return }

      // DB-Stand nachladen um sicherzustellen dass die Änderung wirklich persistiert ist
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Netzwerkfehler – bitte erneut versuchen')
    } finally {
      setSaving(null)
    }
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'regie' ? 'member' : 'regie'
    setRoleChanging(true)
    setError('')
    try {
      const supabase = createClient()
      await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/group-members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || `Serverfehler ${res.status}`)
        return
      }

      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Netzwerkfehler')
    } finally {
      setRoleChanging(false)
    }
  }

  const selectedMember = members.find(m => m.profile.id === selectedUserId)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedUserId && (
              <button onClick={() => setSelectedUserId(null)} className="text-gray-500 hover:text-white mr-1">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">
              {selectedMember
                ? (selectedMember.profile.display_name || selectedMember.profile.email.split('@')[0])
                : 'Mitglieder verwalten'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : !selectedUserId ? (
          /* Personenliste */
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 pb-2">Person auswählen</p>
            {members.map(m => (
              <button
                key={m.profile.id}
                onClick={() => setSelectedUserId(m.profile.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <Avatar name={m.profile.display_name || m.profile.email} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {m.profile.display_name || m.profile.email.split('@')[0]}
                    </p>
                    {m.profile.role === 'admin' && (
                      <span className="text-xs text-amber-400 font-medium flex-shrink-0">Admin</span>
                    )}
                    {m.profile.role === 'regie' && (
                      <span className="text-xs text-sky-400 font-medium flex-shrink-0">Regie</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{m.groupIds.size} Gruppe{m.groupIds.size !== 1 ? 'n' : ''}</p>
                </div>
                <ChevronLeft className="w-4 h-4 rotate-180 text-gray-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          /* Gruppen dieser Person */
          <div className="flex-1 overflow-y-auto p-3">
            {selectedMember && selectedMember.profile.role !== 'admin' && (
              <div className="mb-3 px-2">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider pb-2">Rolle</p>
                <button
                  onClick={() => toggleRole(selectedMember.profile.id, selectedMember.profile.role)}
                  disabled={roleChanging}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full ${
                    selectedMember.profile.role === 'regie'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  {roleChanging
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Clapperboard className="w-4 h-4" />}
                  <span>Regie</span>
                  {selectedMember.profile.role === 'regie' && (
                    <span className="ml-auto text-xs text-amber-400">aktiv</span>
                  )}
                </button>
              </div>
            )}
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 pb-2">
              Antippen zum Hinzufügen / Entfernen
            </p>
            {groups.length === 0 ? (
              <p className="text-gray-600 text-sm px-3">Keine Gruppen vorhanden</p>
            ) : (
              <div className="space-y-1">
                {groups.map(g => {
                  const isMember = selectedMember!.groupIds.has(g.id)
                  const key = `${selectedMember!.profile.id}-${g.id}`
                  const isSaving = saving === key

                  return (
                    <button
                      key={g.id}
                      onClick={() => !isSaving && toggleMembership(selectedMember!.profile.id, g.id, isMember)}
                      disabled={!!saving}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
                        isMember
                          ? 'bg-amber-500/10 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        isMember ? 'bg-amber-500' : 'border-2 border-gray-600'
                      }`}>
                        {isSaving
                          ? <Loader2 className="w-3 h-3 animate-spin text-gray-950" />
                          : isMember ? <Check className="w-3 h-3 text-gray-950" /> : null}
                      </div>
                      <span className="text-xl flex-shrink-0">{g.icon}</span>
                      <span className="text-sm font-medium flex-1 truncate">{getGroupLabel(g, groups)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
