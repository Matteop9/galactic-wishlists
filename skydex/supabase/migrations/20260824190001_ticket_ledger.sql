-- Tickets economy (V4 Phase 3): append-only currency ledger.
-- Balance = sum(delta). All writes go through SECURITY DEFINER RPCs;
-- clients can only read their own rows (no insert/update/delete policies).
create table public.ticket_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in
    ('welcome','daily_grant','spend_capture','purchase','review_reward','ad_reward','admin_adjust','refund')),
  ref text,
  created_at timestamptz not null default now()
);

comment on table public.ticket_ledger is
  'Append-only Tickets currency ledger. Balance = sum(delta). Writes only via SECURITY DEFINER RPCs (claim_daily_tickets / spend_ticket / review_vote / redeem_purchase). ad_reward is reserved for Phase-5 rewarded ads.';

create index ticket_ledger_user_created_idx
  on public.ticket_ledger (user_id, created_at desc);

-- Idempotency guards (partial uniques): each grant/spend can only ever land once.
create unique index ticket_ledger_one_welcome
  on public.ticket_ledger (user_id) where reason = 'welcome';
create unique index ticket_ledger_one_daily_grant
  on public.ticket_ledger (user_id, ((created_at at time zone 'utc')::date)) where reason = 'daily_grant';
create unique index ticket_ledger_purchase_txn
  on public.ticket_ledger (ref) where reason = 'purchase';
create unique index ticket_ledger_one_review_reward
  on public.ticket_ledger (user_id, ref) where reason = 'review_reward';
create unique index ticket_ledger_one_spend_per_sighting
  on public.ticket_ledger (user_id, ref) where reason = 'spend_capture';
create unique index ticket_ledger_one_refund
  on public.ticket_ledger (user_id, ref) where reason = 'refund';

alter table public.ticket_ledger enable row level security;

create policy "ticket_ledger_read_own"
  on public.ticket_ledger for select
  using (auth.uid() = user_id);
