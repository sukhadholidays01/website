-- Run once in the Supabase SQL editor. No public/client access to cab PII.
create table if not exists public.cab_state (
  id text primary key check (id = 'main'),
  revision bigint not null default 1,
  payload jsonb not null
);
alter table public.cab_state enable row level security;
revoke all on public.cab_state from anon, authenticated;
grant select, insert, update on public.cab_state to service_role;
-- The server seeds the main row on first use. Revision checks prevent lost updates.
-- This aggregate store is suitable for an initial low-volume launch. Archive records and
-- migrate to individual booking/fare/payment tables before significant traffic growth.
