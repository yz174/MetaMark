-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Create tables
create table if not exists public.bookmarks (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    url text not null,
    title text,
    favicon text,
    summary text,
    description text,
    tags text[] default array[]::text[],
    user_id uuid references auth.users not null,
    order_index integer default 0
);

-- Create updated_at function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create updated_at trigger
create trigger set_updated_at
    before update on public.bookmarks
    for each row
    execute function public.handle_updated_at();

-- Enable RLS
alter table public.bookmarks enable row level security;

-- Create RLS policies
create policy "Users can view own bookmarks"
    on public.bookmarks for select
    using (auth.uid() = user_id);

create policy "Users can create own bookmarks"
    on public.bookmarks for insert
    with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
    on public.bookmarks for update
    using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
    on public.bookmarks for delete
    using (auth.uid() = user_id);

-- Create indexes
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
create index if not exists bookmarks_created_at_idx on public.bookmarks(created_at desc);

-- Enable realtime subscriptions
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.bookmarks;
