'use client'

import { useState } from 'react'

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url)
}
import { CheckCircle2, Circle, SmilePlus } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { Message, Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'

const EMOJIS = ['👍', '❤️', '😂', '🔥', '✅', '👀', '🎬', '💪']

interface Props {
  message: Message
  currentUser: Profile
  isAdmin: boolean
}

export default function MessageBubble({ message, currentUser, isAdmin }: Props) {
  const [showEmojis, setShowEmojis] = useState(false)
  const [localReactions, setLocalReactions] = useState(message.reactions || [])
  const [approved, setApproved] = useState(message.is_approved)
  const supabase = createClient()

  const authorName = message.profiles?.display_name || message.profiles?.email || 'Unbekannt'
  const isOwn = message.user_id === currentUser.id

  const reactionCounts = localReactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const myReactions = new Set(localReactions.filter(r => r.user_id === currentUser.id).map(r => r.emoji))

  async function toggleReaction(emoji: string) {
    if (myReactions.has(emoji)) {
      await supabase.from('reactions').delete().eq('message_id', message.id).eq('user_id', currentUser.id).eq('emoji', emoji)
      setLocalReactions(prev => prev.filter(r => !(r.user_id === currentUser.id && r.emoji === emoji)))
    } else {
      const { data } = await supabase.from('reactions').insert({ message_id: message.id, user_id: currentUser.id, emoji }).select().single()
      if (data) setLocalReactions(prev => [...prev, data])
    }
    setShowEmojis(false)
  }

  async function toggleApprove() {
    const newApproved = !approved
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: message.id, approved: newApproved }),
    })
    setApproved(newApproved)
  }

  return (
    <div className={`group flex gap-3 px-4 py-1.5 hover:bg-gray-900/50 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar name={authorName} size="sm" />

      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500">{authorName}</span>
          <span className="text-xs text-gray-700">
            {new Date(message.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {message.content && (
          <div className={`relative rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-amber-600/20 border border-amber-600/30' : 'bg-gray-800 border border-gray-700/50'}`}>
            <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            {approved && (
              <div className="flex items-center gap-1 mt-2 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Abgenommen</span>
              </div>
            )}
          </div>
        )}

        {message.image_url && (
          <div className="mt-1">
            {isVideoUrl(message.image_url) ? (
              <video
                src={message.image_url}
                controls
                className="max-w-xs rounded-xl"
                style={{ maxHeight: '300px' }}
              />
            ) : (
              <img
                src={message.image_url}
                alt="Bild"
                className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.image_url!, '_blank')}
              />
            )}
            {!message.content && approved && (
              <div className="flex items-center gap-1 mt-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Abgenommen</span>
              </div>
            )}
          </div>
        )}

        {!message.content && !message.image_url && approved && (
          <div className="flex items-center gap-1 mt-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Abgenommen</span>
          </div>
        )}

        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  myReactions.has(emoji)
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            <button
              onClick={() => setShowEmojis(!showEmojis)}
              className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <SmilePlus className="w-4 h-4" />
            </button>
            {showEmojis && (
              <div className={`absolute bottom-full mb-1 flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-2 shadow-xl z-10 ${isOwn ? 'right-0' : 'left-0'}`}>
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(emoji)}
                    className="hover:scale-125 transition-transform text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={toggleApprove}
              className={`p-1 rounded-lg transition-colors ${
                approved
                  ? 'text-emerald-400 hover:text-gray-400'
                  : 'text-gray-600 hover:text-emerald-400 hover:bg-gray-800'
              }`}
              title={approved ? 'Abnahme zurückziehen' : 'Abnehmen'}
            >
              {approved ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
