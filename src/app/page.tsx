'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedGroupRef = useRef<Group | null>(null)
  const currentUserRef = useRef<Profile | null>(null)

  useEffect(() => { selectedGroupRef.current = selectedGroup }, [selectedGroup])
  useEffect(() => { currentUserRef.current = currentUser }, [currentUser])

  async function markAsRead(userId: string, groupId: string) {
    const supabase = createClient()
    await supabase.from('last_read').upsert(
      { user_id: userId, group_id: groupId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,group_id' }
    )
    setUnreadCounts(prev => ({ ...prev, [groupId]: 0 }))
  }

  function handleSelectGroup(group: Group) {
    setSelectedGroup(group)
    if (currentUserRef.current) {
      markAsRead(currentUserRef.current.id, group.id)
    }
  }

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profile }, { data: memberGroups }, { data: unreadData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('group_members').select('groups(*)').eq('user_id', user.id).order('joined_at', { ascending: true }),
      supabase.rpc('get_unread_counts', { p_user_id: user.id }),
    ])

    if (profile) setCurrentUser(profile)

    if (memberGroups) {
      const groupList = memberGroups
        .map((m: { groups: Group | Group[] | null }) => m.groups)
        .filter((g): g is Group => g !== null && !Array.isArray(g))
      setGroups(groupList)
      if (groupList.length > 0 && !selectedGroupRef.current) {
        const first = groupList[0]
        setSelectedGroup(first)
        markAsRead(user.id, first.id)
      }
    }

    if (unreadData) {
      const counts: Record<string, number> = {}
      unreadData.forEach((row: { group_id: string; unread_count: number }) => {
        counts[row.group_id] = Number(row.unread_count)
      })
      setUnreadCounts(counts)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time: neue Nachrichten → Unread-Badge aktualisieren
  useEffect(() => {
    if (!currentUser) return
    const supabase = createClient()
    const channel = supabase
      .channel('unread-tracker')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { group_id: string; user_id: string }
        if (msg.user_id === currentUserRef.current?.id) return
        if (msg.group_id === selectedGroupRef.current?.id) {
          markAsRead(currentUserRef.current!.id, msg.group_id)
          return
        }
        setUnreadCounts(prev => ({
          ...prev,
          [msg.group_id]: (prev[msg.group_id] || 0) + 1,
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

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
        onSelectGroup={handleSelectGroup}
        onGroupsChanged={fetchData}
        unreadCounts={unreadCounts}
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
