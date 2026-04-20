'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Group, Profile } from '@/types'
import Sidebar from '@/components/sidebar/Sidebar'
import ChatWindow from '@/components/chat/ChatWindow'
import { Hash } from 'lucide-react'

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profile }, { data: memberGroups }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true }),
    ])

    if (profile) setCurrentUser(profile)

    if (memberGroups) {
      const groupList = memberGroups
        .map((m: { groups: Group | Group[] | null }) => m.groups)
        .filter((g): g is Group => g !== null && !Array.isArray(g))
      setGroups(groupList)
      if (groupList.length > 0 && !selectedGroup) {
        setSelectedGroup(groupList[0])
      }
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 text-sm">Lade...</div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      <Sidebar
        groups={groups}
        currentUser={currentUser}
        selectedGroupId={selectedGroup?.id || null}
        onSelectGroup={setSelectedGroup}
        onGroupsChanged={fetchData}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {selectedGroup ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 bg-gray-900/50">
              <span className="text-2xl">{selectedGroup.icon}</span>
              <div>
                <h2 className="text-white font-semibold">{selectedGroup.name}</h2>
                {selectedGroup.description && (
                  <p className="text-gray-500 text-xs">{selectedGroup.description}</p>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow
                group={selectedGroup}
                currentUser={currentUser}
                isAdmin={currentUser.role === 'admin'}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-white font-semibold mb-2">Keine Gruppe ausgewählt</h2>
            <p className="text-gray-500 text-sm max-w-xs">
              {currentUser.role === 'admin'
                ? 'Erstelle deine erste Gruppe über das + in der Sidebar.'
                : 'Du bist noch in keiner Gruppe. Warte auf eine Einladung des Admins.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
