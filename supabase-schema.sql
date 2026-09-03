-- Run this in your Supabase SQL Editor

-- 1. Game state (single row)
create table if not exists game_state (
  id int primary key default 1,
  status text not null default 'waiting',  -- 'waiting' | 'exam' | 'finished'
  current_question int not null default 0,
  show_answers boolean not null default false
);
insert into game_state (id, status, current_question, show_answers)
values (1, 'waiting', 0, false)
on conflict (id) do nothing;

-- 2. Participants
create table if not exists participants (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  avatar text not null,
  score numeric not null default 0,
  has_answered boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

-- 3. Questions
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  type text not null default 'single',   -- 'single' | 'multiple' | 'order'
  options jsonb not null default '[]',
  correct_answer jsonb not null default '[]',
  hint text,
  is_bomb boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz default now()
);

-- 4. Answers
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  participant_id text references participants(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  answer jsonb not null,
  created_at timestamptz default now(),
  unique(participant_id, question_id)
);

-- Enable Row Level Security (allow all for simplicity — tighten for production)
alter table game_state enable row level security;
alter table participants enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;

create policy "public read/write game_state" on game_state for all using (true) with check (true);
create policy "public read/write participants" on participants for all using (true) with check (true);
create policy "public read/write questions" on questions for all using (true) with check (true);
create policy "public read/write answers" on answers for all using (true) with check (true);

-- Enable realtime for these tables
alter publication supabase_realtime add table game_state;
alter publication supabase_realtime add table participants;

-- Existing projects: run this once
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS hint text;
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_bomb boolean default false;
