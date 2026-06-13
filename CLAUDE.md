# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
vercel --prod    # Deploy (project already linked → wapochat.vercel.app)
```

No test suite is configured.

## Stack

- **Next.js 16.2.4** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** — dark theme, `gray-950` base, `amber-500` accent
- **Supabase** — PostgreSQL + Auth (email OTP) + Storage (`chat-images` bucket)
- **Web Push** via `web-push` package (VAPID keys, no third-party service)

Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_WEBHOOK_SECRET` in `.env.local`.

## Architecture

WaPoChat is a real-time group chat app for film production teams. The UI is German.

```
src/
├── app/
│   ├── page.tsx                    # Root: auth gate → Sidebar + ChatWindow
│   ├── api/
│   │   ├── approve/route.ts        # Admin + Regie: approve/reject messages
│   │   ├── invite/route.ts         # Admin: create invite token + send email
│   │   ├── group-members/route.ts  # Admin: GET list, POST/DELETE membership, PATCH role
│   │   ├── messages/route.ts       # Fetch messages with reactions
│   │   ├── my-groups/route.ts      # Fetch groups + profile for current user
│   │   ├── notify/route.ts         # Supabase webhook → Web Push to recipients
│   │   └── push/subscribe/route.ts # Save/delete browser push subscription
├── components/
│   ├── chat/                       # ChatWindow, MessageBubble, MessageInput
│   ├── sidebar/                    # Sidebar, modals (Create/Invite/Members/Profile/Notifications)
│   ├── NotificationBanner.tsx      # Prompts push opt-in; shows iOS install hint
│   └── ServiceWorkerRegister.tsx   # Registers SW on every page (in layout.tsx)
├── hooks/
│   ├── usePushNotifications.ts     # Subscribe/unsubscribe Web Push, tracks permission
│   └── useInstallPrompt.ts         # Captures beforeinstallprompt for install button
└── lib/supabase/
    ├── client.ts   # Browser client — use in Client Components and hooks
    ├── server.ts   # Cookie-based client — use in API routes / RSC
    └── admin.ts    # Service-role client — bypasses RLS, server-only
public/
├── OneSignalSDKWorker.js   # Service worker: fetch passthrough + push handler
├── manifest.json           # PWA manifest (standalone display, amber theme)
└── pwa-debug.html          # Standalone debug page: verifies SW/manifest/install event
supabase/schema.sql         # Full schema + RLS + triggers
```

## Database Schema

| Table | Key columns |
|---|---|
| `profiles` | `id`, `email`, `display_name`, `role` ('admin'\|'regie'\|'member') |
| `groups` | `id`, `name`, `icon`, `parent_id` (max 2-level nesting), `created_by` |
| `group_members` | PK: `(group_id, user_id)` |
| `messages` | `group_id`, `user_id`, `content`, `image_url`, `is_approved` (default false) |
| `reactions` | `message_id`, `user_id`, `emoji`; unique per combination |
| `invitations` | `email`, `token`, `group_id`, `expires_at` (48 h), `used_at` |
| `push_subscriptions` | `user_id`, `endpoint`, `p256dh`, `auth`; unique(user_id, endpoint) |
| `notification_mutes` | `user_id`, `group_id` |

**DB functions (SECURITY DEFINER):** `handle_new_user()` (trigger: create profile + assign group from invite), `add_creator_to_group()` (trigger: auto-add creator as member), `manage_group_member(p_action, p_group_id, p_user_id)` (RPC: admin-gated add/remove, bypasses RLS).

## Roles

- **admin** — full access: manage members, groups, invites, approve messages, assign roles
- **regie** — can approve/reject messages; assigned by admin via MembersModal (`PATCH /api/group-members`)
- **member** — standard user; can send messages, react with emoji

`canApprove` prop (true for admin + regie) gates the approve button in `MessageBubble`. `isAdmin` remains separate for admin-only UI (group management, invites, member modal).

## Key Patterns

**Auth**: Email OTP → `/auth/callback` → `handle_new_user()` trigger → redirect `/`.

**Message approval**: Inserted with `is_approved = false`. Admin or Regie approve/reject via `/api/approve`.

**Reactions**: Any authenticated member can react. Emoji picker shows always on mobile (`md:opacity-0 md:group-hover:opacity-100`), on hover only on desktop. Real-time via `postgres_changes` subscription on `reactions` table.

**Real-time**: `ChatWindow` subscribes to `postgres_changes` for messages + reactions; calls `fetchMessages` on any event rather than merging manually.

**Push flow**: Message INSERT → Supabase webhook → `/api/notify` → `web-push` sends to `push_subscriptions`. Browser subscribes via `usePushNotifications` → `POST /api/push/subscribe`. SW handles `push` and `notificationclick`.

**iOS PWA / RLS caveat**: Client-side Supabase writes gated by admin RLS policies can silently fail on iOS because the auth cookie isn't always synced from localStorage. Fix: use a `SECURITY DEFINER` RPC (e.g. `manage_group_member`) that enforces the admin check inside Postgres. `MembersModal` uses this pattern; do not revert it to direct inserts.

**Group creation**: `CreateGroupModal` explicitly upserts the creator into `group_members` after insert as a backup for the DB trigger.
