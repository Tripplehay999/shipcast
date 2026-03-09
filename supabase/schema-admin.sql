-- =========================================================
-- Admin Schema — Run in Supabase SQL Editor
-- =========================================================

-- Admin audit log: every privileged action is recorded
create table if not exists admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id text        not null,
  action        text        not null,  -- plan_change, ban_user, unban_user, create_coupon, delete_coupon, create_ticket, resolve_ticket, flag_user
  target_user_id text,                 -- affected user (if any)
  metadata      jsonb,                 -- { old_plan, new_plan, reason, coupon_code, … }
  ip            text,
  created_at    timestamptz not null default now()
);
create index if not exists admin_audit_log_admin_idx  on admin_audit_log(admin_user_id);
create index if not exists admin_audit_log_target_idx on admin_audit_log(target_user_id);
create index if not exists admin_audit_log_created_idx on admin_audit_log(created_at desc);

-- User flags / bans
create table if not exists user_flags (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text        not null,
  flag_type     text        not null,  -- spam | abuse | suspicious | chargeback | banned
  note          text,
  created_by    text        not null,  -- admin clerk_user_id
  resolved_at   timestamptz,
  resolved_by   text,
  created_at    timestamptz not null default now()
);
create index if not exists user_flags_user_idx    on user_flags(clerk_user_id);
create index if not exists user_flags_resolved_idx on user_flags(resolved_at);

-- Support tickets
create table if not exists admin_tickets (
  id              uuid primary key default gen_random_uuid(),
  user_clerk_id   text,               -- null = internal / no user
  subject         text        not null,
  body            text,
  status          text        not null default 'open',  -- open | in_progress | resolved | closed
  priority        text        not null default 'medium', -- low | medium | high | urgent
  assigned_to     text,               -- admin clerk_user_id
  created_by      text        not null,
  resolved_at     timestamptz,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists admin_tickets_status_idx   on admin_tickets(status);
create index if not exists admin_tickets_user_idx     on admin_tickets(user_clerk_id);
create index if not exists admin_tickets_priority_idx on admin_tickets(priority, status);

-- Ticket notes / internal discussion
create table if not exists admin_ticket_notes (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid        not null references admin_tickets(id) on delete cascade,
  admin_user_id text        not null,
  note          text        not null,
  created_at    timestamptz not null default now()
);
create index if not exists admin_ticket_notes_ticket_idx on admin_ticket_notes(ticket_id);

-- Admin coupons — grant plan upgrades directly (no Stripe required)
create table if not exists admin_coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text        unique not null,
  plan          text        not null,  -- pro | studio
  duration_days integer,               -- null = permanent
  max_uses      integer,               -- null = unlimited
  used_count    integer     not null default 0,
  created_by    text        not null,
  expires_at    timestamptz,
  active        boolean     not null default true,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists admin_coupons_code_idx on admin_coupons(code);

-- Coupon redemptions
create table if not exists admin_coupon_redemptions (
  id            uuid primary key default gen_random_uuid(),
  coupon_id     uuid        not null references admin_coupons(id),
  clerk_user_id text        not null,
  redeemed_at   timestamptz not null default now(),
  unique (coupon_id, clerk_user_id)
);
create index if not exists admin_coupon_redemptions_user_idx   on admin_coupon_redemptions(clerk_user_id);
create index if not exists admin_coupon_redemptions_coupon_idx on admin_coupon_redemptions(coupon_id);

-- RLS off (service role only, never exposed to frontend)
alter table admin_audit_log         disable row level security;
alter table user_flags              disable row level security;
alter table admin_tickets           disable row level security;
alter table admin_ticket_notes      disable row level security;
alter table admin_coupons           disable row level security;
alter table admin_coupon_redemptions disable row level security;
