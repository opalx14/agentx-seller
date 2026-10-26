create extension if not exists pgcrypto;

create table if not exists public.agentx_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.agentx_customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.agentx_shops(id) on delete cascade,
  external_customer_id text not null,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  unique (shop_id, external_customer_id),
  unique (shop_id, phone)
);

create table if not exists public.agentx_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.agentx_shops(id) on delete cascade,
  customer_id uuid not null references public.agentx_customers(id) on delete restrict,
  order_number text not null,
  status text not null check (status in ('pending','confirmed','shipped','delivered','cancelled','refunded')),
  total_amount bigint not null check (total_amount >= 0),
  currency text not null default 'VND',
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (shop_id, order_number)
);

create table if not exists public.agentx_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.agentx_orders(id) on delete cascade,
  carrier text not null,
  tracking_number text not null,
  status text not null check (status in ('label_created','in_transit','delivered')),
  estimated_delivery date,
  updated_at timestamptz not null default now()
);

create table if not exists public.agentx_conversations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.agentx_shops(id) on delete cascade,
  customer_id uuid references public.agentx_customers(id) on delete set null,
  channel text not null check (channel in ('web','whatsapp')),
  external_conversation_id text,
  status text not null default 'ai_active' check (status in ('ai_active','human_required','human_active','closed')),
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, channel, external_conversation_id)
);

create table if not exists public.agentx_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agentx_conversations(id) on delete cascade,
  sender text not null check (sender in ('customer','ai','human','system')),
  content text not null,
  external_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.agentx_returns (
  id text primary key,
  order_id uuid not null references public.agentx_orders(id) on delete cascade,
  reason text not null,
  status text not null default 'created' check (status in ('created','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (order_id)
);

create table if not exists public.agentx_refunds (
  id text primary key,
  order_id uuid not null references public.agentx_orders(id) on delete cascade,
  amount bigint not null check (amount > 0),
  reason text not null,
  status text not null check (status in ('requested','approved','rejected','processed')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.agentx_approvals (
  id text primary key,
  shop_id uuid not null references public.agentx_shops(id) on delete cascade,
  order_id uuid not null references public.agentx_orders(id) on delete cascade,
  type text not null default 'refund',
  amount bigint not null check (amount > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.agentx_policies (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.agentx_shops(id) on delete cascade,
  auto_refund_limit bigint not null default 500000 check (auto_refund_limit >= 0),
  return_window_days integer not null default 7 check (return_window_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agentx_audit_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.agentx_shops(id) on delete set null,
  conversation_id uuid references public.agentx_conversations(id) on delete set null,
  actor text not null,
  action text not null,
  tool_name text,
  input jsonb,
  output jsonb,
  status text not null check (status in ('success','warning','error')),
  created_at timestamptz not null default now()
);

create index if not exists agentx_orders_shop_customer_idx on public.agentx_orders(shop_id, customer_id);
create index if not exists agentx_orders_number_idx on public.agentx_orders(order_number);
create index if not exists agentx_messages_conversation_created_idx on public.agentx_messages(conversation_id, created_at);
create index if not exists agentx_approvals_status_created_idx on public.agentx_approvals(status, created_at desc);
create index if not exists agentx_audit_created_idx on public.agentx_audit_logs(created_at desc);

alter table public.agentx_shops enable row level security;
alter table public.agentx_customers enable row level security;
alter table public.agentx_orders enable row level security;
alter table public.agentx_shipments enable row level security;
alter table public.agentx_conversations enable row level security;
alter table public.agentx_messages enable row level security;
alter table public.agentx_returns enable row level security;
alter table public.agentx_refunds enable row level security;
alter table public.agentx_approvals enable row level security;
alter table public.agentx_policies enable row level security;
alter table public.agentx_audit_logs enable row level security;

revoke all on table public.agentx_shops from anon, authenticated;
revoke all on table public.agentx_customers from anon, authenticated;
revoke all on table public.agentx_orders from anon, authenticated;
revoke all on table public.agentx_shipments from anon, authenticated;
revoke all on table public.agentx_conversations from anon, authenticated;
revoke all on table public.agentx_messages from anon, authenticated;
revoke all on table public.agentx_returns from anon, authenticated;
revoke all on table public.agentx_refunds from anon, authenticated;
revoke all on table public.agentx_approvals from anon, authenticated;
revoke all on table public.agentx_policies from anon, authenticated;
revoke all on table public.agentx_audit_logs from anon, authenticated;

grant select, insert, update, delete on table public.agentx_shops to service_role;
grant select, insert, update, delete on table public.agentx_customers to service_role;
grant select, insert, update, delete on table public.agentx_orders to service_role;
grant select, insert, update, delete on table public.agentx_shipments to service_role;
grant select, insert, update, delete on table public.agentx_conversations to service_role;
grant select, insert, update, delete on table public.agentx_messages to service_role;
grant select, insert, update, delete on table public.agentx_returns to service_role;
grant select, insert, update, delete on table public.agentx_refunds to service_role;
grant select, insert, update, delete on table public.agentx_approvals to service_role;
grant select, insert, update, delete on table public.agentx_policies to service_role;
grant select, insert, update, delete on table public.agentx_audit_logs to service_role;

insert into public.agentx_shops (name)
values ('AgentX Demo Store')
on conflict (name) do nothing;

insert into public.agentx_customers (shop_id, external_customer_id, name, phone)
select s.id, v.external_customer_id, v.name, v.phone
from public.agentx_shops s
cross join (
  values
    ('cus_001', 'Nguyen Van A', '+84901111111'),
    ('cus_002', 'Tran Van B', '+84902222222'),
    ('cus_003', 'Le Van C', '+84903333333')
) as v(external_customer_id, name, phone)
where s.name = 'AgentX Demo Store'
on conflict (shop_id, external_customer_id) do update
set name = excluded.name,
    phone = excluded.phone;

insert into public.agentx_orders (shop_id, customer_id, order_number, status, total_amount, currency, created_at, delivered_at)
select s.id, c.id, v.order_number, v.status, v.total_amount, 'VND', v.created_at, v.delivered_at
from public.agentx_shops s
join (
  values
    ('cus_001', 'A1001', 'shipped', 450000::bigint, '2026-10-17T18:00:00+07'::timestamptz, null::timestamptz),
    ('cus_002', 'A1002', 'delivered', 1800000::bigint, '2026-10-16T18:00:00+07'::timestamptz, '2026-10-19T18:00:00+07'::timestamptz),
    ('cus_003', 'A1003', 'delivered', 300000::bigint, '2026-10-15T18:00:00+07'::timestamptz, '2026-10-18T18:00:00+07'::timestamptz)
) as v(external_customer_id, order_number, status, total_amount, created_at, delivered_at) on true
join public.agentx_customers c
  on c.shop_id = s.id
 and c.external_customer_id = v.external_customer_id
where s.name = 'AgentX Demo Store'
on conflict (shop_id, order_number) do update
set customer_id = excluded.customer_id,
    status = excluded.status,
    total_amount = excluded.total_amount,
    currency = excluded.currency,
    delivered_at = excluded.delivered_at;

insert into public.agentx_shipments (order_id, carrier, tracking_number, status, estimated_delivery)
select o.id, v.carrier, v.tracking_number, v.status, v.estimated_delivery
from public.agentx_orders o
join (
  values
    ('A1001', 'GHN', 'GHN-A1001', 'in_transit', '2026-10-23'::date),
    ('A1002', 'GHTK', 'GHTK-A1002', 'delivered', null::date),
    ('A1003', 'J&T', 'JT-A1003', 'delivered', null::date)
) as v(order_number, carrier, tracking_number, status, estimated_delivery)
  on v.order_number = o.order_number
join public.agentx_shops s on s.id = o.shop_id and s.name = 'AgentX Demo Store'
on conflict (order_id) do update
set carrier = excluded.carrier,
    tracking_number = excluded.tracking_number,
    status = excluded.status,
    estimated_delivery = excluded.estimated_delivery,
    updated_at = now();

insert into public.agentx_policies (shop_id, auto_refund_limit, return_window_days)
select id, 500000, 7
from public.agentx_shops
where name = 'AgentX Demo Store'
on conflict (shop_id) do update
set auto_refund_limit = excluded.auto_refund_limit,
    return_window_days = excluded.return_window_days,
    updated_at = now();
