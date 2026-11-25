-- Initial Simi Compliance schema. Apply only after reviewing in the target Supabase project.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.request_status as enum ('submitted', 'under_review', 'awaiting_information', 'processing', 'completed', 'cancelled');
create type public.fulfilment_type as enum ('direct', 'quote', 'consultation');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  requirements jsonb not null default '[]'::jsonb,
  process_steps jsonb not null default '[]'::jsonb,
  fulfilment_type public.fulfilment_type not null default 'consultation',
  price_kobo bigint check (price_kobo is null or price_kobo >= 0),
  price_is_public boolean not null default false,
  estimated_days_min integer check (estimated_days_min is null or estimated_days_min >= 0),
  estimated_days_max integer check (estimated_days_max is null or estimated_days_max >= estimated_days_min),
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  customer_id uuid not null references public.profiles(id),
  service_id uuid not null references public.services(id),
  status public.request_status not null default 'submitted',
  customer_note text,
  staff_note text,
  quoted_amount_kobo bigint check (quoted_amount_kobo is null or quoted_amount_kobo >= 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  old_status public.request_status,
  new_status public.request_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id),
  customer_id uuid not null references public.profiles(id),
  provider text not null default 'paystack',
  provider_reference text not null unique,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  status text not null default 'initialized' check (status in ('initialized', 'pending', 'successful', 'failed', 'refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  created_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message text not null check (length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index service_requests_customer_idx on public.service_requests(customer_id, submitted_at desc);
create index service_requests_status_idx on public.service_requests(status, submitted_at desc);
create index services_category_active_idx on public.services(category_id, is_active);
create index payments_customer_idx on public.payments(customer_id, created_at desc);
create index request_documents_request_idx on public.request_documents(request_id);

-- Keep privileged policy helpers in a non-exposed schema, not the public API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create or replace function private.is_staff_or_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('staff', 'admin')); $$;
revoke all on function private.is_staff_or_admin() from public;
grant execute on function private.is_staff_or_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.request_documents enable row level security;
alter table public.support_messages enable row level security;

create policy "profiles read own or staff" on public.profiles for select using (id = auth.uid() or private.is_staff_or_admin());
create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql set search_path = ''
as $$ begin
  if new.role is distinct from old.role then
    raise exception 'Profile role cannot be changed through the customer profile endpoint';
  end if;
  return new;
end; $$;
create trigger prevent_profile_role_change before update on public.profiles
for each row execute procedure public.prevent_profile_role_change();
create policy "profiles update own basic fields" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "public read active categories" on public.service_categories for select using (is_active = true or private.is_staff_or_admin());
create policy "public read active services" on public.services for select using (is_active = true or private.is_staff_or_admin());
create policy "customer read own requests" on public.service_requests for select using (customer_id = auth.uid() or private.is_staff_or_admin());
create policy "customer create own requests" on public.service_requests for insert with check (customer_id = auth.uid());
create policy "staff update requests" on public.service_requests for update using (private.is_staff_or_admin()) with check (private.is_staff_or_admin());
create policy "history read own request or staff" on public.request_status_history for select using (private.is_staff_or_admin() or exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid()));
create policy "staff create status history" on public.request_status_history for insert with check (private.is_staff_or_admin());
create policy "customer read own payments" on public.payments for select using (customer_id = auth.uid() or private.is_staff_or_admin());
create policy "staff manage payments" on public.payments for all using (private.is_staff_or_admin()) with check (private.is_staff_or_admin());
create policy "customer read own request docs" on public.request_documents for select using (uploaded_by = auth.uid() or private.is_staff_or_admin());
create policy "customer add docs to own request" on public.request_documents for insert with check (uploaded_by = auth.uid() and exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid()));
create policy "customer read own support messages" on public.support_messages for select using (sender_id = auth.uid() or private.is_staff_or_admin() or exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid()));
create policy "customer send support messages" on public.support_messages for insert with check (sender_id = auth.uid() and (request_id is null or exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid())));

-- Profile creation trigger: role is always the database default (customer).
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', '')); return new; end; $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

insert into public.service_categories (slug, name, description, sort_order) values
('business-registration', 'Business Registration & CAC', 'Business name, company, NGO and corporate compliance assistance.', 1),
('nin-identity', 'NIN & Identity Services', 'Guidance for eligible identity verification and modification requests.', 2),
('documents-certificates', 'Documentation & Certificates', 'Support with selected civil, academic and personal documentation processes.', 3),
('intellectual-property', 'Intellectual Property', 'Trademark search support and application assistance.', 4),
('digital-business', 'Digital Business Services', 'Digital presence support and learning resources.', 5)
on conflict (slug) do nothing;
