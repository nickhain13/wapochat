-- WaPoChat Datenbankschema
-- Ausführen im Supabase SQL Editor

-- Aktiviere UUID-Erweiterung
create extension if not exists "uuid-ossp";

-- Profile (erweitert auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

-- Gruppen/Kanäle
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  icon text default '🎬',
  parent_id uuid references public.groups(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Grupenmitgliedschaften
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Nachrichten
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  image_url text,
  is_approved boolean default false,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- Reaktionen auf Nachrichten
create table public.reactions (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);

-- Einladungen
create table public.invitations (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  group_id uuid references public.groups(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz default now() + interval '48 hours',
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security aktivieren
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.invitations enable row level security;

-- Policies: Profiles
create policy "Jeder kann Profile sehen" on public.profiles for select using (true);
create policy "Eigenes Profil bearbeiten" on public.profiles for update using (auth.uid() = id);
create policy "Profil anlegen" on public.profiles for insert with check (auth.uid() = id);

-- Policies: Groups
create policy "Mitglieder sehen ihre Gruppen" on public.groups for select
  using (
    exists (select 1 from public.group_members where group_id = id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Angemeldete erstellen Gruppen" on public.groups for insert
  with check (auth.uid() is not null);
create policy "Admins bearbeiten Gruppen" on public.groups for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins löschen Gruppen" on public.groups for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Policies: Group Members
create policy "Mitgliedschaften sehen" on public.group_members for select using (true);
create policy "Admins verwalten Mitglieder" on public.group_members for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins entfernen Mitglieder" on public.group_members for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Policies: Messages
create policy "Gruppenmitglieder lesen Nachrichten" on public.messages for select
  using (exists (select 1 from public.group_members where group_id = messages.group_id and user_id = auth.uid()));
create policy "Gruppenmitglieder schreiben Nachrichten" on public.messages for insert
  with check (exists (select 1 from public.group_members where group_id = messages.group_id and user_id = auth.uid()));
create policy "Eigene Nachrichten löschen" on public.messages for delete
  using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins genehmigen Nachrichten" on public.messages for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Policies: Reactions
create policy "Reaktionen sehen" on public.reactions for select using (true);
create policy "Reaktionen hinzufügen" on public.reactions for insert
  with check (auth.uid() = user_id);
create policy "Eigene Reaktionen entfernen" on public.reactions for delete
  using (auth.uid() = user_id);

-- Policies: Invitations
create policy "Admins sehen Einladungen" on public.invitations for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins erstellen Einladungen" on public.invitations for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Profil automatisch bei Registrierung erstellen + Gruppe aus Einladung zuweisen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));

  select * into inv from public.invitations
  where lower(email) = lower(new.email)
    and used_at is null
    and group_id is not null
  order by created_at desc
  limit 1;

  if found then
    insert into public.group_members (group_id, user_id)
    values (inv.group_id, new.id)
    on conflict do nothing;
    update public.invitations set used_at = now() where id = inv.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Gruppenersteller automatisch als Mitglied hinzufügen
create or replace function public.add_creator_to_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id)
    values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute procedure public.add_creator_to_group();

-- Storage Bucket für Bilder
insert into storage.buckets (id, name, public) values ('chat-images', 'chat-images', true);

create policy "Angemeldete können Bilder hochladen" on storage.objects for insert
  with check (bucket_id = 'chat-images' and auth.role() = 'authenticated');
create policy "Bilder sind öffentlich sichtbar" on storage.objects for select
  using (bucket_id = 'chat-images');
create policy "Eigene Bilder löschen" on storage.objects for delete
  using (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);
