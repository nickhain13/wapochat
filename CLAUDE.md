# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test suite is configured.

## Stack

- **Next.js 16.2.4** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** — dark theme, `gray-950` base, `amber-500` accent
- **Supabase** — PostgreSQL + Auth (email OTP) + Storage (`chat-images` bucket)
- **Real-time** via Supabase `postgres_changes` subscriptions

Environment: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## Architecture

WaPoChat is a real-time group chat app for film production teams. The UI is German.

```
src/
├── app/
│   ├── page.tsx              # Root: auth gate → Sidebar + ChatWindow layout
│   ├── login/page.tsx        # Email OTP login
│   ├── auth/callback/route.ts
│   └── api/
│       ├── invite/route.ts   # Admin: create invite token + send email
│       └── approve/route.ts  # Admin: approve/reject a message
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx    # Message list + real-time subscription
│   │   ├── MessageBubble.tsx # Renders message, reactions, admin controls
│   │   └── MessageInput.tsx  # Text + image upload (10 MB limit)
│   └── sidebar/
│       ├── Sidebar.tsx           # Hierarchical group tree + user menu
│       ├── CreateGroupModal.tsx
│       └── InviteModal.tsx
├── lib/supabase/
│   ├── client.ts   # Browser client (singleton)
│   └── server.ts   # Server client (cookies)
└── types/index.ts  # Shared TS interfaces
supabase/schema.sql # Full schema + RLS + storage setup
```

## Database Schema

| Table | Key columns |
|---|---|
| `profiles` | `id` (→ auth.users), `email`, `display_name`, `role` ('admin'\|'member') |
| `groups` | `id`, `name`, `icon` (emoji), `parent_id` (nullable, max 2-level nesting) |
| `group_members` | `group_id`, `user_id` |
| `messages` | `group_id`, `user_id`, `content`, `image_url`, `is_approved` (default false) |
| `reactions` | `message_id`, `user_id`, `emoji`; unique(message_id, user_id, emoji) |
| `invitations` | `email`, `token`, `group_id` (optional), `expires_at` (48 h), `used_at` |

RLS is enabled on all tables. Admin-only actions (approve messages, manage members, send invites) are enforced both in RLS policies and in API route middleware.

## Key Patterns

**Auth flow**: Email OTP → `/auth/callback` exchanges code → DB trigger `handle_new_user()` auto-creates `profiles` row → redirect to `/`.

**Message approval**: All messages are inserted with `is_approved = false`. Only admins see unapproved messages and can approve/reject via `/api/approve`.

**Group hierarchy**: `groups.parent_id` enables nesting up to 2 levels. `Sidebar.tsx` builds the tree client-side via `buildTree()` and renders it recursively with `GroupNode`.

**Real-time**: `ChatWindow` subscribes to `postgres_changes` for both `messages` and `reactions` on mount; unsubscribes on unmount. State updates call `fetchMessages` rather than merging events manually.

**Supabase clients**: Use `lib/supabase/client.ts` in Client Components and `lib/supabase/server.ts` in Server Components / Route Handlers.
