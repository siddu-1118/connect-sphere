-- =========================================================================
-- AEROMEET - ASSIGNMENTS & NOTIFICATION RECIPIENTS SCHEMAS (IDEMPOTENT)
-- =========================================================================

-- 1. ASSIGNMENTS TABLE
create table if not exists public.assignments (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    teacher_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    description text,
    due_date timestamp with time zone,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS for assignments
alter table public.assignments enable row level security;

-- 2. ASSIGNMENT RECIPIENTS TABLE (Option A)
create table if not exists public.assignment_recipients (
    assignment_id uuid references public.assignments(id) on delete cascade,
    student_id uuid references public.users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'submitted', 'graded')),
    created_at timestamp with time zone default now() not null,
    primary key (assignment_id, student_id)
);

-- Enable RLS for assignment_recipients
alter table public.assignment_recipients enable row level security;

-- 3. MESSAGE RECIPIENTS TABLE (Option B)
create table if not exists public.message_recipients (
    message_id uuid references public.messages(id) on delete cascade,
    student_id uuid references public.users(id) on delete cascade,
    created_at timestamp with time zone default now() not null,
    primary key (message_id, student_id)
);

-- Enable RLS for message_recipients
alter table public.message_recipients enable row level security;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Assignments select policy: Workspace members can view assignments
drop policy if exists "Allow select assignments to workspace members" on public.assignments;
create policy "Allow select assignments to workspace members"
    on public.assignments for select
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_members.workspace_id = workspace_id and workspace_members.user_id = auth.uid()
        )
    );

-- Assignments insert policy: Only workspace admins or workspace owners can create assignments
drop policy if exists "Allow insert assignments to workspace admins/owners" on public.assignments;
create policy "Allow insert assignments to workspace admins/owners"
    on public.assignments for insert
    to authenticated
    with check (
        auth.uid() = teacher_id
        and (
            exists (
                select 1 from public.workspace_members
                where workspace_members.workspace_id = workspace_id and workspace_members.user_id = auth.uid() and workspace_members.role = 'admin'
            )
            or exists (
                select 1 from public.workspaces
                where workspaces.id = workspace_id and workspaces.owner_id = auth.uid()
            )
        )
    );

-- Assignments update/delete policy: Only the creator (teacher) can edit or delete
drop policy if exists "Allow update/delete assignments to creator" on public.assignments;
create policy "Allow update/delete assignments to creator"
    on public.assignments for all
    to authenticated
    using (auth.uid() = teacher_id);


-- Assignment Recipients select policy: Workspace members can view recipients
drop policy if exists "Allow select recipients to workspace members" on public.assignment_recipients;
create policy "Allow select recipients to workspace members"
    on public.assignment_recipients for select
    to authenticated
    using (
        exists (
            select 1 from public.assignments
            join public.workspace_members on workspace_members.workspace_id = assignments.workspace_id
            where assignments.id = assignment_id and workspace_members.user_id = auth.uid()
        )
    );

-- Assignment Recipients insert policy: Creator (teacher) can insert recipients
drop policy if exists "Allow insert recipients to workspace admins/owners" on public.assignment_recipients;
create policy "Allow insert recipients to workspace admins/owners"
    on public.assignment_recipients for insert
    to authenticated
    with check (
        exists (
            select 1 from public.assignments
            where assignments.id = assignment_id and assignments.teacher_id = auth.uid()
        )
    );

-- Assignment Recipients update policy: Student can submit, teacher can edit status/grade
drop policy if exists "Allow update recipient status to student or teacher" on public.assignment_recipients;
create policy "Allow update recipient status to student or teacher"
    on public.assignment_recipients for update
    to authenticated
    using (
        auth.uid() = student_id
        or exists (
            select 1 from public.assignments
            where assignments.id = assignment_id and assignments.teacher_id = auth.uid()
        )
    );


-- Message Recipients select policy: Workspace members can view message recipients
drop policy if exists "Allow select message recipients to workspace members" on public.message_recipients;
create policy "Allow select message recipients to workspace members"
    on public.message_recipients for select
    to authenticated
    using (
        exists (
            select 1 from public.messages
            join public.channels on channels.id = messages.channel_id
            join public.workspace_members on workspace_members.workspace_id = channels.workspace_id
            where messages.id = message_id and workspace_members.user_id = auth.uid()
        )
    );

-- Message Recipients insert policy: Only the sender of the message can add recipients
drop policy if exists "Allow insert message recipients to sender" on public.message_recipients;
create policy "Allow insert message recipients to sender"
    on public.message_recipients for insert
    to authenticated
    with check (
        exists (
            select 1 from public.messages
            where messages.id = message_id and messages.user_id = auth.uid()
        )
    );
