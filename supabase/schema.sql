-- ============================================================
-- heySynk — Complete Supabase Schema (clean drop + recreate)
-- ============================================================

-- Drop everything in reverse dependency order
drop table if exists password_resets cascade;
drop table if exists invitations cascade;
drop table if exists notifications cascade;
drop table if exists csat_responses cascade;
drop table if exists routing_rules cascade;
drop table if exists campaigns cascade;
drop table if exists kb_articles cascade;
drop table if exists kb_categories cascade;
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists contacts cascade;
drop table if exists agents cascade;
drop table if exists workspaces cascade;

-- Drop functions
drop function if exists update_updated_at cascade;
drop function if exists get_agent_workspace_id cascade;
drop function if exists is_workspace_admin cascade;

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- WORKSPACES
-- ============================================================
create table workspaces (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  logo_url      text,
  accent_color  text default '#2563eb',
  timezone      text default 'UTC',
  business_hours jsonb default '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"}}',
  ai_tone       text default 'friendly' check (ai_tone in ('formal','friendly','neutral')),
  plan          text default 'free' check (plan in ('free','starter','pro','enterprise')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- AGENTS
-- ============================================================
create table agents (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  name          text not null,
  email         text not null,
  role          text default 'agent' check (role in ('admin','senior_agent','agent','technical_support','custom')),
  avatar_url    text,
  status        text default 'offline' check (status in ('online','away','offline')),
  permissions   jsonb default '{}',
  invited_at    timestamptz default now(),
  joined_at     timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(workspace_id, email)
);

-- ============================================================
-- CONTACTS
-- ============================================================
create table contacts (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  name              text,
  email             text,
  phone             text,
  company           text,
  location          text,
  avatar_url        text,
  tags              text[] default '{}',
  custom_attributes jsonb default '{}',
  last_seen_at      timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index idx_contacts_workspace on contacts(workspace_id);
create index idx_contacts_email on contacts(workspace_id, email);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  contact_id      uuid references contacts(id) on delete set null,
  assigned_to     uuid references agents(id) on delete set null,
  status          text default 'open' check (status in ('open','pending','resolved','snoozed')),
  channel         text default 'livechat' check (channel in ('livechat','email','whatsapp','messenger')),
  priority        text default 'normal' check (priority in ('urgent','high','normal')),
  subject         text,
  label           text,
  tags            text[] default '{}',
  last_message    text,
  last_message_at timestamptz,
  unread_count    int default 0,
  snoozed_until   timestamptz,
  sticky_note     text,
  meta            jsonb default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_conversations_workspace on conversations(workspace_id);
create index idx_conversations_status on conversations(workspace_id, status);
create index idx_conversations_assigned on conversations(assigned_to);
create index idx_conversations_contact on conversations(contact_id);

-- ============================================================
-- MESSAGES
-- ============================================================
create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  sender_type     text not null check (sender_type in ('agent','contact','ai','system')),
  sender_id       uuid,
  body            text not null,
  type            text default 'text' check (type in ('text','note','activity','ai')),
  is_private      bool default false,
  is_sticky       bool default false,
  attachments     jsonb default '[]',
  read_by         uuid[] default '{}',
  created_at      timestamptz default now()
);
create index idx_messages_conversation on messages(conversation_id);
create index idx_messages_workspace on messages(workspace_id);

-- ============================================================
-- KB CATEGORIES
-- ============================================================
create table kb_categories (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  slug         text not null,
  description  text,
  icon         text,
  color        text default '#2563eb',
  position     int default 0,
  created_at   timestamptz default now(),
  unique(workspace_id, slug)
);

-- ============================================================
-- KB ARTICLES
-- ============================================================
create table kb_articles (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  category_id     uuid references kb_categories(id) on delete set null,
  author_id       uuid references agents(id) on delete set null,
  title           text not null,
  slug            text not null,
  body            text,
  excerpt         text,
  status          text default 'draft' check (status in ('draft','published','archived')),
  tags            text[] default '{}',
  seo_title       text,
  seo_description text,
  sticky_note     text,
  views           int default 0,
  helpful_yes     int default 0,
  helpful_no      int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(workspace_id, slug)
);
create index idx_articles_workspace on kb_articles(workspace_id);
create index idx_articles_category on kb_articles(category_id);
create index idx_articles_status on kb_articles(workspace_id, status);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table campaigns (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  type         text default 'chat' check (type in ('chat','banner','email')),
  status       text default 'draft' check (status in ('draft','active','paused','archived')),
  conditions   jsonb default '[]',
  message      text not null,
  frequency    text default 'once_ever' check (frequency in ('once_ever','once_per_session','every_visit')),
  sent_count   int default 0,
  open_count   int default 0,
  reply_count  int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- ROUTING RULES
-- ============================================================
create table routing_rules (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  status       text default 'active' check (status in ('active','paused')),
  conditions   jsonb default '[]',
  actions      jsonb default '[]',
  position     int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- CSAT
-- ============================================================
create table csat_responses (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  agent_id        uuid references agents(id) on delete set null,
  score           int not null check (score between 1 and 5),
  feedback        text,
  created_at      timestamptz default now()
);
create index idx_csat_workspace on csat_responses(workspace_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id     uuid not null references agents(id) on delete cascade,
  type         text not null,
  title        text not null,
  body         text,
  link         text,
  read         bool default false,
  created_at   timestamptz default now()
);
create index idx_notifications_agent on notifications(agent_id, read);

-- ============================================================
-- INVITATIONS
-- ============================================================
create table invitations (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         text default 'agent',
  token        text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by   uuid references agents(id),
  accepted_at  timestamptz,
  expires_at   timestamptz default (now() + interval '7 days'),
  created_at   timestamptz default now()
);

-- ============================================================
-- PASSWORD RESETS
-- ============================================================
create table password_resets (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null,
  token      text unique not null default encode(gen_random_bytes(32), 'hex'),
  used       bool default false,
  expires_at timestamptz default (now() + interval '1 hour'),
  created_at timestamptz default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_workspaces_updated    before update on workspaces    for each row execute function update_updated_at();
create trigger trg_agents_updated        before update on agents         for each row execute function update_updated_at();
create trigger trg_contacts_updated      before update on contacts       for each row execute function update_updated_at();
create trigger trg_conversations_updated before update on conversations  for each row execute function update_updated_at();
create trigger trg_kb_articles_updated   before update on kb_articles    for each row execute function update_updated_at();
create trigger trg_campaigns_updated     before update on campaigns      for each row execute function update_updated_at();
create trigger trg_routing_updated       before update on routing_rules  for each row execute function update_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table workspaces      enable row level security;
alter table agents          enable row level security;
alter table contacts        enable row level security;
alter table conversations   enable row level security;
alter table messages        enable row level security;
alter table kb_categories   enable row level security;
alter table kb_articles     enable row level security;
alter table campaigns       enable row level security;
alter table routing_rules   enable row level security;
alter table csat_responses  enable row level security;
alter table notifications   enable row level security;
alter table invitations     enable row level security;

create or replace function get_agent_workspace_id()
returns uuid as $$
  select workspace_id from agents where user_id = auth.uid() limit 1;
$$ language sql security definer stable;

create or replace function is_workspace_admin(ws_id uuid)
returns bool as $$
  select exists (
    select 1 from agents
    where workspace_id = ws_id
    and user_id = auth.uid()
    and role = 'admin'
  );
$$ language sql security definer stable;

-- Workspaces
create policy "agents view own workspace" on workspaces for select using (id = get_agent_workspace_id());
create policy "admins update workspace" on workspaces for update using (is_workspace_admin(id));

-- Agents
create policy "agents view teammates" on agents for select using (workspace_id = get_agent_workspace_id());
create policy "admins manage agents" on agents for all using (is_workspace_admin(workspace_id));
create policy "agents update self" on agents for update using (user_id = auth.uid());

-- Contacts
create policy "agents manage contacts" on contacts for all using (workspace_id = get_agent_workspace_id());

-- Conversations
create policy "agents manage conversations" on conversations for all using (workspace_id = get_agent_workspace_id());

-- Messages
create policy "agents manage messages" on messages for all using (workspace_id = get_agent_workspace_id());

-- KB
create policy "agents manage kb categories" on kb_categories for all using (workspace_id = get_agent_workspace_id());
create policy "agents manage kb articles" on kb_articles for all using (workspace_id = get_agent_workspace_id());

-- Campaigns
create policy "agents manage campaigns" on campaigns for all using (workspace_id = get_agent_workspace_id());

-- Routing
create policy "admins manage routing" on routing_rules for all using (is_workspace_admin(workspace_id));
create policy "agents view routing" on routing_rules for select using (workspace_id = get_agent_workspace_id());

-- CSAT
create policy "agents view csat" on csat_responses for select using (workspace_id = get_agent_workspace_id());
create policy "anyone insert csat" on csat_responses for insert with check (true);

-- Notifications
create policy "agents manage own notifications" on notifications for all using (
  agent_id in (select id from agents where user_id = auth.uid())
);

-- Invitations
create policy "admins manage invitations" on invitations for all using (is_workspace_admin(workspace_id));
create policy "anyone view invitation" on invitations for select using (true);
