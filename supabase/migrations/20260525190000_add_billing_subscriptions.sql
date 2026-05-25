create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dodo_customer_id text,
  dodo_subscription_id text unique,
  product_id text,
  plan text not null default 'free',
  status text not null default 'pending',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_status_idx
  on public.user_subscriptions (status);

create index if not exists user_subscriptions_customer_idx
  on public.user_subscriptions (dodo_customer_id);

create table if not exists public.dodo_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.dodo_checkout_sessions (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create index if not exists dodo_checkout_sessions_user_idx
  on public.dodo_checkout_sessions (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_subscriptions_updated_at on public.user_subscriptions;
create trigger set_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_updated_at();

alter table public.user_subscriptions enable row level security;
alter table public.dodo_webhook_events enable row level security;
alter table public.dodo_checkout_sessions enable row level security;

drop policy if exists "Users can read their own subscription" on public.user_subscriptions;
create policy "Users can read their own subscription"
on public.user_subscriptions
for select
to authenticated
using (auth.uid() = user_id);
