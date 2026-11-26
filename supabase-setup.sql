-- MATCHA LOG database setup
-- Run this in Supabase > SQL Editor. Safe to run after the initial three tables exist.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  size_g numeric,
  price numeric,
  is_limited boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade
);
create table if not exists public.collection (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  status text not null default 'want' check (status in ('want','owned','opened','finished')),
  collected boolean not null default false,
  tasted boolean not null default false,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade
);

alter table public.brands add column if not exists country text;
alter table public.products add column if not exists size_g numeric;
alter table public.products add column if not exists price numeric;
alter table public.products add column if not exists is_limited boolean not null default false;
alter table public.products add column if not exists notes text;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.collection add column if not exists status text not null default 'want';
alter table public.collection add column if not exists collected boolean not null default false;
alter table public.collection add column if not exists tasted boolean not null default false;

alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.collection enable row level security;

drop policy if exists "Users manage own brands" on public.brands;
create policy "Users manage own brands" on public.brands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own products" on public.products;
create policy "Users manage own products" on public.products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own collection" on public.collection;
create policy "Users manage own collection" on public.collection for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.brands, public.products, public.collection to authenticated;
