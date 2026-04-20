'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, Profile, Group } from '@/types'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

interface Props {
  group: Group
  currentUser: Profile
  isAdmin: boolean
}

export default function ChatWindow({ group, currentUser, isAdmin }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), [])

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, profiles!messages_user_id_fkey(*), reactions(*)`)
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Nachrichten Fehler:', error.message, error.details)
      setError(error.message)
    } else {
      setError('')
    }
    setMessages(data || [])
    setLoading(false)
  }, [group.id, supabase])

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`group-${group.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `group_id=eq.${group.id}` }, fetchMessages)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, fetchMessages)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [group.id, fetchMessages, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-600 text-sm">Lade Nachrichten...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            Fehler beim Laden: {error}
          </div>
        )}
        {messages.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-5xl mb-4">{group.icon}</div>
            <h3 className="text-white font-semibold mb-1">{group.name}</h3>
            <p className="text-gray-500 text-sm">Noch keine Nachrichten. Schreib die erste!</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <MessageInput groupId={group.id} userId={currentUser.id} onSent={fetchMessages} />
    </div>
  )
}
