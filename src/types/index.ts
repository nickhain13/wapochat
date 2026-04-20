export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member'
  created_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  icon: string
  parent_id: string | null
  created_by: string | null
  created_at: string
}

export interface Message {
  id: string
  group_id: string
  user_id: string
  content: string | null
  image_url: string | null
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
  profiles?: Profile
  reactions?: Reaction[]
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  joined_at: string
  profiles?: Profile
}
