-- =========================================================================
-- Tables
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index profiles_email_key on public.profiles (lower(email));

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index circle_members_user_id_idx on public.circle_members (user_id);

create table public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  email text not null check (email = lower(email)),
  invited_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create unique index circle_invites_pending_key
  on public.circle_invites (circle_id, email)
  where status = 'pending';
create index circle_invites_email_idx on public.circle_invites (email);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null default 'activity',
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  joined_from_log_id uuid references public.activity_logs (id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index activity_logs_circle_range_idx on public.activity_logs (circle_id, start_at, end_at);
create index activity_logs_joined_from_idx on public.activity_logs (joined_from_log_id);

-- =========================================================================
-- Helpers (security definer so RLS policies can use them without recursion)
-- =========================================================================

create function public.is_circle_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = cid and user_id = auth.uid()
  );
$$;

create function public.shares_circle_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.circle_members mine
    join public.circle_members theirs on theirs.circle_id = mine.circle_id
    where mine.user_id = auth.uid() and theirs.user_id = other_user
  );
$$;

-- =========================================================================
-- Profile creation on signup / invite
-- =========================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- RPCs
-- =========================================================================

create function public.create_circle(circle_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.circles (name, created_by)
  values (trim(circle_name), auth.uid())
  returning id into new_id;

  insert into public.circle_members (circle_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

create function public.get_my_pending_invites()
returns table (
  id uuid,
  circle_id uuid,
  circle_name text,
  invited_by_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.circle_id, c.name, coalesce(p.full_name, p.email), i.created_at
  from public.circle_invites i
  join public.circles c on c.id = i.circle_id
  join public.profiles p on p.id = i.invited_by
  where i.status = 'pending'
    and i.email = lower(auth.jwt() ->> 'email')
    and not exists (
      select 1 from public.circle_members m
      where m.circle_id = i.circle_id and m.user_id = auth.uid()
    )
  order by i.created_at desc;
$$;

create function public.respond_to_invite(invite_id uuid, accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.circle_invites;
begin
  select * into inv
  from public.circle_invites
  where id = invite_id
    and status = 'pending'
    and email = lower(auth.jwt() ->> 'email');

  if not found then
    raise exception 'Invite not found';
  end if;

  if accept then
    insert into public.circle_members (circle_id, user_id, role)
    values (inv.circle_id, auth.uid(), 'member')
    on conflict do nothing;
  end if;

  update public.circle_invites
  set status = case when accept then 'accepted' else 'declined' end
  where id = invite_id;

  return inv.circle_id;
end;
$$;

create function public.accept_invite(invite_id uuid)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.respond_to_invite(invite_id, true);
$$;

create function public.decline_invite(invite_id uuid)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.respond_to_invite(invite_id, false);
$$;

-- =========================================================================
-- Row level security
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_invites enable row level security;
alter table public.activities enable row level security;
alter table public.activity_logs enable row level security;

-- profiles
create policy "Profiles are visible to self and circle-mates"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_circle_with(id));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- circles
create policy "Members can see their circles"
  on public.circles for select to authenticated
  using (public.is_circle_member(id) or created_by = auth.uid());

create policy "Owners can rename circles"
  on public.circles for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- circle_members
create policy "Members can see fellow members"
  on public.circle_members for select to authenticated
  using (public.is_circle_member(circle_id));

create policy "Members can leave a circle"
  on public.circle_members for delete to authenticated
  using (user_id = auth.uid());

-- circle_invites
create policy "Members and invitees can see invites"
  on public.circle_invites for select to authenticated
  using (
    public.is_circle_member(circle_id)
    or email = lower(auth.jwt() ->> 'email')
  );

create policy "Members can invite"
  on public.circle_invites for insert to authenticated
  with check (public.is_circle_member(circle_id) and invited_by = auth.uid());

-- activities
create policy "Owners manage their activities"
  on public.activities for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Circle-mates can see activities"
  on public.activities for select to authenticated
  using (public.shares_circle_with(owner_id));

-- activity_logs
create policy "Circle members see logs"
  on public.activity_logs for select to authenticated
  using (public.is_circle_member(circle_id));

create policy "Users log their own activities"
  on public.activity_logs for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_circle_member(circle_id)
    and exists (
      select 1 from public.activities a
      where a.id = activity_id and a.owner_id = auth.uid()
    )
  );

create policy "Users update their own logs"
  on public.activity_logs for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_circle_member(circle_id)
    and exists (
      select 1 from public.activities a
      where a.id = activity_id and a.owner_id = auth.uid()
    )
  );

create policy "Users delete their own logs"
  on public.activity_logs for delete to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- Realtime
-- =========================================================================

alter table public.activity_logs replica identity full;
alter publication supabase_realtime add table public.activity_logs;

-- =========================================================================
-- Storage: avatars
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update their own avatars"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own avatars"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
