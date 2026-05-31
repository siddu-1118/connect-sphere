-- =========================================================================
-- AEROMEET DATABASE SCHEMA & SECURITY POLICIES (IDEMPOTENT)
-- =========================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- 1. USERS PROFILE TABLE
create table if not exists public.users (
    id uuid primary key references auth.users on delete cascade,
    email text not null unique,
    display_name text,
    avatar_url text,
    status text not null default 'online' check (status in ('online', 'offline', 'busy', 'away', 'dnd')),
    created_at timestamp with time zone default now() not null
);

-- Enable RLS for users
alter table public.users enable row level security;

-- 2. WORKSPACES TABLE
create table if not exists public.workspaces (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    owner_id uuid not null references public.users(id) on delete cascade,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS for workspaces
alter table public.workspaces enable row level security;

-- 3. WORKSPACE MEMBERS TABLE (Junction Table)
create table if not exists public.workspace_members (
    user_id uuid references public.users(id) on delete cascade,
    workspace_id uuid references public.workspaces(id) on delete cascade,
    role text not null default 'member' check (role in ('admin', 'member')),
    created_at timestamp with time zone default now() not null,
    primary key (user_id, workspace_id)
);

-- Enable RLS for workspace_members
alter table public.workspace_members enable row level security;

-- 4. CHANNELS TABLE
create table if not exists public.channels (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    type text not null default 'chat' check (type in ('chat', 'voice')),
    description text,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS for channels
alter table public.channels enable row level security;

-- 5. MESSAGES TABLE (With Parent Message Id for Threading)
create table if not exists public.messages (
    id uuid primary key default uuid_generate_v4(),
    channel_id uuid not null references public.channels(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    content text not null,
    parent_message_id uuid references public.messages(id) on delete cascade,
    priority text not null default 'Standard' check (priority in ('Standard', 'Important', 'Urgent')),
    created_at timestamp with time zone default now() not null
);

-- Enable RLS for messages
alter table public.messages enable row level security;

-- 6. MEETINGS TABLE
create table if not exists public.meetings (
    id uuid primary key default uuid_generate_v4(),
    host_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    is_active boolean not null default false,
    passcode text,
    scheduled_for timestamp with time zone,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS for meetings
alter table public.meetings enable row level security;


-- =========================================================================
-- SYSTEM TRIGGERS & CORE PROCEDURES
-- =========================================================================

-- Trigger function to copy metadata on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.users (id, email, display_name, avatar_url, status)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        'online'
    )
    on conflict (id) do update
    set 
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url;
    return new;
end;
$$ language plpgsql security definer;

-- Recreate Auth trigger cleanly
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Users Policies:
drop policy if exists "Allow profile read to all authenticated users" on public.users;
create policy "Allow profile read to all authenticated users"
    on public.users for select
    to authenticated
    using (true);

drop policy if exists "Allow updates to self profile" on public.users;
create policy "Allow updates to self profile"
    on public.users for update
    to authenticated
    using (auth.uid() = id);

-- Workspaces Policies:
drop policy if exists "Allow workspace view to member users" on public.workspaces;
create policy "Allow workspace view to member users"
    on public.workspaces for select
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_members.workspace_id = id and workspace_members.user_id = auth.uid()
        )
    );

drop policy if exists "Allow workspace creation to all authenticated users" on public.workspaces;
create policy "Allow workspace creation to all authenticated users"
    on public.workspaces for insert
    to authenticated
    with check (auth.uid() = owner_id);

drop policy if exists "Allow owner to edit or delete workspace" on public.workspaces;
create policy "Allow owner to edit or delete workspace"
    on public.workspaces for all
    to authenticated
    using (auth.uid() = owner_id);

-- Workspace Members Policies:
drop policy if exists "Allow members of same workspace to view member list" on public.workspace_members;
create policy "Allow members of same workspace to view member list"
    on public.workspace_members for select
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members as self
            where self.workspace_id = workspace_id and self.user_id = auth.uid()
        )
    );

drop policy if exists "Allow admins to invite or edit workspace members" on public.workspace_members;
create policy "Allow admins to invite or edit workspace members"
    on public.workspace_members for all
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members as self
            where self.workspace_id = workspace_id and self.user_id = auth.uid() and self.role = 'admin'
        )
        or exists (
            select 1 from public.workspaces as ws
            where ws.id = workspace_id and ws.owner_id = auth.uid()
        )
    );

-- Channels Policies:
drop policy if exists "Allow channel view to workspace members" on public.channels;
create policy "Allow channel view to workspace members"
    on public.channels for select
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_members.workspace_id = workspace_id and workspace_members.user_id = auth.uid()
        )
    );

drop policy if exists "Allow channel creation/modification to workspace admins/owners" on public.channels;
create policy "Allow channel creation/modification to workspace admins/owners"
    on public.channels for all
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_members.workspace_id = workspace_id and workspace_members.user_id = auth.uid() and workspace_members.role = 'admin'
        )
        or exists (
            select 1 from public.workspaces
            where workspaces.id = workspace_id and workspaces.owner_id = auth.uid()
        )
    );

-- Messages Policies:
drop policy if exists "Allow message read to workspace members" on public.messages;
create policy "Allow message read to workspace members"
    on public.messages for select
    to authenticated
    using (
        exists (
            select 1 from public.channels
            join public.workspace_members on workspace_members.workspace_id = channels.workspace_id
            where channels.id = channel_id and workspace_members.user_id = auth.uid()
        )
    );

drop policy if exists "Allow message insertion to workspace members" on public.messages;
create policy "Allow message insertion to workspace members"
    on public.messages for insert
    to authenticated
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from public.channels
            join public.workspace_members on workspace_members.workspace_id = channels.workspace_id
            where channels.id = channel_id and workspace_members.user_id = auth.uid()
        )
    );

drop policy if exists "Allow message deletion/modification to message sender" on public.messages;
create policy "Allow message deletion/modification to message sender"
    on public.messages for all
    to authenticated
    using (auth.uid() = user_id);

-- Meetings Policies:
drop policy if exists "Allow select meetings if authenticated" on public.meetings;
create policy "Allow select meetings if authenticated"
    on public.meetings for select
    to authenticated
    using (true);

drop policy if exists "Allow insert meetings if authenticated" on public.meetings;
create policy "Allow insert meetings if authenticated"
    on public.meetings for insert
    to authenticated
    with check (auth.uid() = host_id);

drop policy if exists "Allow all actions to host of meeting" on public.meetings;
create policy "Allow all actions to host of meeting"
    on public.meetings for all
    to authenticated
    using (auth.uid() = host_id);
