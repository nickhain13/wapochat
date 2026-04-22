'use client'

import { useState } from 'react'
import { Plus, UserPlus, LogOut, Film, ChevronRight, ChevronDown, X, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Group, Profile } from '@/types'
import Avatar from '@/components/ui/Avatar'
import CreateGroupModal from './CreateGroupModal'
import InviteModal from './InviteModal'
import MembersModal from './MembersModal'
import { useRouter } from 'next/navigation'

interface TreeNode {
  group: Group
  children: TreeNode[]
  depth: number
}

function buildTree(groups: Group[], parentId: string | null = null, depth = 0): TreeNode[] {
  return groups
    .filter(g => g.parent_id === parentId)
    .map(g => ({
      group: g,
      children: depth < 2 ? buildTree(groups, g.id, depth + 1) : [],
      depth,
    }))
}

interface GroupNodeProps {
  node: TreeNode
  selectedGroupId: string | null
  onSelectGroup: (group: Group) => void
  onAddSub: (parent: Group) => void
  isAdmin: boolean
}

function GroupNode({ node, selectedGroupId, onSelectGroup, onAddSub, isAdmin }: GroupNodeProps) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  const isSelected = selectedGroupId === node.group.id

  const indent = node.depth * 12

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-xl pr-1 transition-colors cursor-pointer ${
          isSelected ? 'bg-amber-500/15 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        <button
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-600"
          onClick={() => hasChildren && setOpen(!open)}
        >
          {hasChildren
            ? open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            : null}
        </button>

        <button
          className="flex items-center gap-2 flex-1 py-1.5 text-left min-w-0"
          onClick={() => onSelectGroup(node.group)}
        >
          <span className="text-base flex-shrink-0">{node.group.icon}</span>
          <span className="text-sm font-medium truncate">{node.group.name}</span>
        </button>

        {node.depth < 2 && (
          <button
            onClick={() => onAddSub(node.group)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-600 hover:text-amber-400 transition-all flex-shrink-0"
            title="Untergruppe erstellen"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map(child => (
            <GroupNode
              key={child.group.id}
              node={child}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              onAddSub={onAddSub}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  groups: Group[]
  currentUser: Profile
  selectedGroupId: string | null
  onSelectGroup: (group: Group) => void
  onGroupsChanged: () => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ groups, currentUser, selectedGroupId, onSelectGroup, onGroupsChanged, isOpen, onClose }: Props) {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [parentGroup, setParentGroup] = useState<Group | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const isAdmin = currentUser.role === 'admin'
  const router = useRouter()
  const supabase = createClient()

  const tree = buildTree(groups)

  function handleAddSub(parent: Group) {
    setParentGroup(parent)
    setShowCreateGroup(true)
  }

  function handleCreateTop() {
    setParentGroup(null)
    setShowCreateGroup(true)
  }

  function handleSelectGroup(group: Group) {
    onSelectGroup(group)
    onClose()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <Film className="w-4 h-4 text-gray-950" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-none">WaPoChat</h1>
            <p className="text-gray-500 text-xs">Filmproduktion</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-gray-600 hover:text-gray-400 transition-colors"
          aria-label="Sidebar schließen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Gruppen</span>
          <button
            onClick={handleCreateTop}
            className="text-gray-600 hover:text-amber-400 transition-colors"
            title="Neue Gruppe"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {tree.map(node => (
          <GroupNode
            key={node.group.id}
            node={node}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            onAddSub={handleAddSub}
            isAdmin={isAdmin}
          />
        ))}

        {tree.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-8">
            {isAdmin ? 'Erstelle deine erste Gruppe' : 'Noch keine Gruppen'}
          </p>
        )}
      </div>

      <div className="p-3 border-t border-gray-800 space-y-1">
        {isAdmin && (
          <>
            <button
              onClick={() => setShowMembers(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-left"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-sm">Mitglieder verwalten</span>
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-left"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span className="text-sm">Person einladen</span>
            </button>
          </>
        )}

        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <Avatar name={currentUser.display_name || currentUser.email} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{currentUser.display_name || currentUser.email.split('@')[0]}</p>
            <p className="text-gray-500 text-xs">{isAdmin ? 'Admin' : 'Mitglied'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: static in-flow sidebar */}
      <div className="hidden md:flex">
        {sidebarContent}
      </div>

      {/* Mobile: overlay drawer */}
      <div className={`md:hidden fixed inset-0 z-50 flex transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className={`relative flex transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          userId={currentUser.id}
          parentGroup={parentGroup}
          allGroups={groups}
          onClose={() => setShowCreateGroup(false)}
          onCreated={onGroupsChanged}
        />
      )}

      {showInvite && (
        <InviteModal
          groups={groups}
          onClose={() => setShowInvite(false)}
        />
      )}

      {showMembers && (
        <MembersModal onClose={() => setShowMembers(false)} />
      )}
    </>
  )
}
