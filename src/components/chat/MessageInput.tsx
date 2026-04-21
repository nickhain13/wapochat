'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, X, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  groupId: string
  userId: string
  onSent: () => void
}

const IMAGE_MAX = 10 * 1024 * 1024   // 10 MB
const VIDEO_MAX = 100 * 1024 * 1024  // 100 MB

function isVideoFile(file: File) {
  return file.type.startsWith('video/')
}

export default function MessageInput({ groupId, userId, onSent }: Props) {
  const [text, setText] = useState('')
  const [media, setMedia] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = isVideoFile(file)
    const limit = isVideo ? VIDEO_MAX : IMAGE_MAX
    const limitLabel = isVideo ? '100 MB' : '10 MB'

    if (file.size > limit) {
      alert(`${isVideo ? 'Video' : 'Bild'} darf maximal ${limitLabel} groß sein.`)
      return
    }

    setMedia(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  function removeMedia() {
    setMedia(null)
    setMediaPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSend() {
    if (!text.trim() && !media) return
    setUploading(true)

    let mediaUrl: string | null = null

    if (media) {
      const ext = media.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('chat-images').upload(path, media)
      if (!error) {
        const { data } = supabase.storage.from('chat-images').getPublicUrl(path)
        mediaUrl = data.publicUrl
      }
    }

    await supabase.from('messages').insert({
      group_id: groupId,
      user_id: userId,
      content: text.trim() || null,
      image_url: mediaUrl,
    })

    setText('')
    removeMedia()
    setUploading(false)
    onSent()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isVideo = media ? isVideoFile(media) : false

  return (
    <div className="p-4 border-t border-gray-800">
      {mediaPreview && (
        <div className="relative inline-block mb-3">
          {isVideo ? (
            <div className="relative">
              <video
                src={mediaPreview}
                className="h-24 rounded-xl border border-gray-700 bg-gray-900"
                style={{ maxWidth: '200px' }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 rounded-full p-1.5">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <img src={mediaPreview} alt="Vorschau" className="h-24 rounded-xl border border-gray-700" />
          )}
          <button
            onClick={removeMedia}
            className="absolute -top-2 -right-2 bg-gray-700 hover:bg-gray-600 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-gray-800 rounded-2xl border border-gray-700 focus-within:border-amber-500/50 transition-colors px-3 py-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="text-gray-500 hover:text-amber-400 transition-colors p-1 flex-shrink-0"
          title="Bild oder Video hinzufügen"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht schreiben..."
          rows={1}
          className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none resize-none max-h-32 py-1"
          style={{ scrollbarWidth: 'none' }}
        />

        <button
          onClick={handleSend}
          disabled={uploading || (!text.trim() && !media)}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-gray-950 rounded-xl p-2 transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-gray-700 text-xs mt-1.5 ml-1">Enter zum Senden · Shift+Enter für neue Zeile</p>
    </div>
  )
}
