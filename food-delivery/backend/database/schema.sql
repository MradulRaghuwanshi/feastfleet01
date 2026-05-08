-- FeastFleet PostgreSQL reference schema.
-- Firestore is used by the current app, but this schema defines the production relational model.

create extension if not exists citext;

create table users (
  id uuid primary key,
  name text not null,
  email citext not null unique,
  phone text,
  password_hash text not null,
  role text not null check (role in ('customer', 'restaurant', 'delivery', 'admin')),
  refresh_token_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table restaurants (
  id uuid primary key,
  owner_id uuid references users(id),
  name text not null,
  cuisine text not null,
  address text not null,
  lat numeric(10, 7),
  lng numeric(10, 7),
  is_open boolean not null default true,
  commission_percent numeric(5, 2) not null default 15,
  created_at timestamptz not null default now()
);

create table delivery_partners (
  user_id uuid primary key references users(id),
  vehicle text,
  is_available boolean not null default true,
  current_lat numeric(10, 7),
  current_lng numeric(10, 7),
  active_order_limit integer not null default 5,
  per_delivery_rate numeric(10, 2) not null default 40
);

create table menu_items (
  id uuid primary key,
  restaurant_id uuid not null references restaurants(id),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  category text,
  image_url text,
  available boolean not null default true
);

create table wallets (
  customer_id uuid primary key references users(id),
  current_balance integer not null default 0 check (current_balance >= 0),
  earned_this_month integer not null default 0,
  redeemed_this_month integer not null default 0,
  month_key char(7) not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table feast_coin_transactions (
  id uuid primary key,
  customer_id uuid not null references users(id),
  order_id uuid,
  type text not null check (type in ('earn', 'redeem', 'expire', 'admin_adjust')),
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  month_key char(7) not null,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key,
  order_number text not null unique,
  customer_id uuid not null references users(id),
  restaurant_id uuid not null references restaurants(id),
  delivery_partner_id uuid references users(id),
  status text not null,
  food_subtotal numeric(10, 2) not null,
  tax_amount numeric(10, 2) not null default 0,
  platform_fee numeric(10, 2) not null default 8,
  packaging_fee numeric(10, 2) not null default 10,
  delivery_fee numeric(10, 2) not null,
  discount_amount numeric(10, 2) not null default 0,
  feast_coin_redemption integer not null default 0,
  total_amount numeric(10, 2) not null,
  pickup_otp_hash text not null,
  pickup_otp_cipher text not null,
  pickup_otp_expires_at timestamptz not null,
  pickup_otp_attempts integer not null default 0,
  pickup_otp_locked_until timestamptz,
  pickup_otp_verified_at timestamptz,
  restaurant_accepted_at timestamptz,
  assigned_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key,
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  name text not null,
  price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

create table delivery_assignments (
  id uuid primary key,
  order_id uuid not null references orders(id),
  delivery_partner_id uuid references users(id),
  status text not null check (status in ('broadcast', 'accepted', 'reassigned', 'cancelled')),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table delivery_earnings (
  order_id uuid primary key references orders(id),
  delivery_partner_id uuid not null references users(id),
  amount numeric(10, 2) not null default 40,
  status text not null default 'pending_settlement',
  created_at timestamptz not null default now()
);

create table restaurant_settlements (
  order_id uuid primary key references orders(id),
  restaurant_id uuid not null references restaurants(id),
  gross_food_amount numeric(10, 2) not null,
  platform_commission numeric(10, 2) not null,
  net_settlement_amount numeric(10, 2) not null,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key,
  user_id uuid references users(id),
  order_id uuid references orders(id),
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_orders_customer_created on orders(customer_id, created_at desc);
create index idx_orders_restaurant_created on orders(restaurant_id, created_at desc);
create index idx_orders_delivery_status on orders(delivery_partner_id, status);
create index idx_coin_transactions_customer_created on feast_coin_transactions(customer_id, created_at desc);
create index idx_settlements_restaurant_status on restaurant_settlements(restaurant_id, status);
create unique index uq_one_accepted_assignment_per_order on delivery_assignments(order_id) where status = 'accepted';
