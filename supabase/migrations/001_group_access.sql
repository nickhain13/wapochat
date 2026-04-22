-- Migration 001: Gruppen-Zugangsverwaltung
-- Im Supabase SQL Editor ausführen

-- 1. handle_new_user: eingeladene User automatisch zur Gruppe hinzufügen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));

  -- Neuesten gültigen Invite mit Gruppe suchen
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

-- 2. Trigger: Gruppenersteller automatisch als Mitglied hinzufügen
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

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute procedure public.add_creator_to_group();

-- 3. Alle angemeldeten User dürfen Gruppen erstellen (nicht nur Admins)
drop policy if exists "Admins erstellen Gruppen" on public.groups;
drop policy if exists "Angemeldete erstellen Gruppen" on public.groups;
create policy "Angemeldete erstellen Gruppen" on public.groups for insert
  with check (auth.uid() is not null);

-- 4. Admins sehen alle Gruppen (nicht nur eigene)
drop policy if exists "Mitglieder sehen ihre Gruppen" on public.groups;
create policy "Mitglieder sehen ihre Gruppen" on public.groups for select
  using (
    exists (select 1 from public.group_members where group_id = id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
