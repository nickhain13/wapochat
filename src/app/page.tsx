'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Group, Profile } from '@/types'
import Sidebar from '@/components/sidebar/Sidebar'
import ChatWindow from '@/components/chat/ChatWindow'
import NotificationBanner from '@/components/NotificationBanner'
import { Hash, Menu } from 'lucide-react'

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <NotificationBanner userId={currentUser.id} />

        {selectedGroup ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 bg-gray-900/50">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-gray-400 hover:text-white transition-colors flex-shrink-0 -ml-1 p-1"
                aria-label="Menü öffnen"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-2xl">{selectedGroup.icon}</span>
              <div className="min-w-0">
                <h2 className="text-white font-semibold truncate">{selectedGroup.name}</h2>
                {selectedGroup.description && (
                  <p className="text-gray-500 text-xs truncate">{selectedGroup.description}</p>
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden absolute top-4 left-4 text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Menü öffnen"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-white font-semibold mb-2">Keine Gruppe ausgewählt</h2>
            <p className="text-gray-500 text-sm max-w-xs">
              Erstelle eine neue Gruppe über das + in der Sidebar oder warte auf eine Einladung.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
