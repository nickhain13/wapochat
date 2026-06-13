'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Bell, BellOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Group } from '@/types'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface Props {
  userId: string
  groups: Group[]
  onClose: () => void
}

export default function NotificationSettings({ userId, groups, onClose }: Props) {
  const { permission, subscribed, loading: pushLoading, subscribe, unsubscribe, supported } = usePushNotifications()
  const [mutedGroupIds, setMutedGroupIds] = useState<Set<string>>(new Set())
  const [loadingMutes, setLoadingMutes] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase
      .from('notification_mutes')
      .select('group_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        setMutedGroupIds(new Set(data?.map((m: { group_id: string }) => m.group_id) || []))
        setLoadingMutes(false)
      })
  }, [supabase, userId])

  async function toggleGlobal() {
    if (subscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  async function toggleGroup(groupId: string) {
    setToggling(groupId)
    const isMuted = mutedGroupIds.has(groupId)

    if (isMuted) {
      await supabase.from('notification_mutes').delete()
        .eq('user_id', userId).eq('group_id', groupId)
      setMutedGroupIds(prev => { const n = new Set(prev); n.delete(groupId); return n })
    } else {
      await supabase.from('notification_mutes').insert({ user_id: userId, group_id: groupId })
      setMutedGroupIds(prev => new Set(prev).add(groupId))
    }
    setToggling(null)
  }

  const globalEnabled = subscribed && permission === 'granted'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">Benachrichtigungen</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingMutes ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : !supported ? (
          <div className="p-5 text-gray-500 text-sm text-center">
            Dieser Browser unterstützt keine Push-Benachrichtigungen.
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {permission === 'denied' && (
              <p className="text-gray-500 text-xs px-3 pb-2">
                Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen aktivieren.
              </p>
            )}
            <button
              onClick={toggleGlobal}
              disabled={pushLoading || permission === 'denied'}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {globalEnabled
                  ? <Bell className="w-4 h-4 text-amber-400" />
                  : <BellOff className="w-4 h-4 text-gray-500" />}
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Alle Benachrichtigungen</p>
                  <p className="text-gray-500 text-xs">{globalEnabled ? 'Aktiv' : 'Deaktiviert'}</p>
                </div>
              </div>
              {pushLoading
                ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                : <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${globalEnabled ? 'bg-amber-500' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${globalEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
              }
            </button>

            {globalEnabled && groups.length > 0 && (
              <>
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-3 pt-3 pb-1">
                  Gruppen stumm schalten
                </p>
                {groups.map(g => {
                  const muted = mutedGroupIds.has(g.id)
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGroup(g.id)}
                      disabled={!!toggling}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{g.icon}</span>
                        <span className={`text-sm font-medium ${muted ? 'text-gray-500' : 'text-white'}`}>
                          {g.name}
                        </span>
                      </div>
                      {toggling === g.id
                        ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                        : muted
                          ? <BellOff className="w-4 h-4 text-gray-600" />
                          : <Bell className="w-4 h-4 text-amber-400" />
                      }
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
