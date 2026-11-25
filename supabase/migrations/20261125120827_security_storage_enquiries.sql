-- Tighten authorization, add secure private document storage and public contact enquiries.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_staff_or_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('staff', 'admin')
  );
$$;
create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function private.is_staff_or_admin() from public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_staff_or_admin() to anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- Replace policies that previously referenced a public helper function.
drop policy if exists "profiles read own or staff" on public.profiles;
drop policy if exists "profiles update own basic fields" on public.profiles;
drop policy if exists "public read active categories" on public.service_categories;
drop policy if exists "public read active services" on public.services;
drop policy if exists "customer read own requests" on public.service_requests;
drop policy if exists "customer create own requests" on public.service_requests;
drop policy if exists "staff update requests" on public.service_requests;
drop policy if exists "history read own request or staff" on public.request_status_history;
drop policy if exists "staff create status history" on public.request_status_history;
drop policy if exists "customer read own payments" on public.payments;
drop policy if exists "staff manage payments" on public.payments;
drop policy if exists "customer read own request docs" on public.request_documents;
drop policy if exists "customer add docs to own request" on public.request_documents;
drop policy if exists "customer read own support messages" on public.support_messages;
drop policy if exists "customer send support messages" on public.support_messages;

create policy "profiles read own or staff" on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_staff_or_admin()));
create policy "profiles update own basic fields" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "admin update profiles" on public.profiles for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "public read active categories" on public.service_categories for select to anon, authenticated
using (is_active = true or (select private.is_staff_or_admin()));
create policy "admin manage categories" on public.service_categories for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "public read active services" on public.services for select to anon, authenticated
using (is_active = true or (select private.is_staff_or_admin()));
create policy "admin manage services" on public.services for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "customer read own requests" on public.service_requests for select to authenticated
using (customer_id = (select auth.uid()) or (select private.is_staff_or_admin()));
create policy "customer create own requests" on public.service_requests for insert to authenticated
with check (customer_id = (select auth.uid()));
create policy "staff update requests" on public.service_requests for update to authenticated
using ((select private.is_staff_or_admin())) with check ((select private.is_staff_or_admin()));
create policy "history read own request or staff" on public.request_status_history for select to authenticated
using ((select private.is_staff_or_admin()) or exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid())));
create policy "staff create status history" on public.request_status_history for insert to authenticated
with check ((select private.is_staff_or_admin()));
create policy "customer read own payments" on public.payments for select to authenticated
using (customer_id = (select auth.uid()) or (select private.is_staff_or_admin()));
create policy "staff read payment records" on public.payments for select to authenticated
using ((select private.is_staff_or_admin()));
create policy "customer read own request docs" on public.request_documents for select to authenticated
using (uploaded_by = (select auth.uid()) or (select private.is_staff_or_admin()));
create policy "customer add docs to own request" on public.request_documents for insert to authenticated
with check (uploaded_by = (select auth.uid()) and exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid())));
create policy "customer read own support messages" on public.support_messages for select to authenticated
using (sender_id = (select auth.uid()) or (select private.is_staff_or_admin()) or exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid())));
create policy "customer send support messages" on public.support_messages for insert to authenticated
with check (sender_id = (select auth.uid()) and (request_id is null or exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid()))));

-- Do not expose the staff helper in the public API schema.
drop function if exists public.is_staff_or_admin();

-- Request references are generated by the database; customers cannot choose their own status or reference.
alter table public.service_requests alter column reference_code
  set default ('SIMI-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)));

-- Narrow API grants. RLS controls rows; grants control which operations/columns are available.
grant select on public.service_categories, public.services to anon, authenticated;
grant insert, update, delete on public.service_categories, public.services to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, updated_at) on public.profiles to authenticated;
grant select on public.service_requests to authenticated;
grant insert (customer_id, service_id, customer_note) on public.service_requests to authenticated;
grant update (status, staff_note, quoted_amount_kobo, updated_at) on public.service_requests to authenticated;
grant select on public.request_status_history to authenticated;
grant insert on public.request_status_history to authenticated;
grant select on public.payments to authenticated;
grant select, insert on public.request_documents to authenticated;
grant select, insert on public.support_messages to authenticated;

-- Customer-created records cannot forge roles. Admin role changes remain a trusted server/SQL operation.
create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not (select private.is_admin()) then
    raise exception 'Only an administrator may change account roles';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_profile_role_change() from public;

-- A contact form accepts only ordinary contact details. Never put NIN/BVN/document data here.
create table if not exists public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30),
  service_interest text check (service_interest is null or char_length(service_interest) <= 120),
  message text not null check (char_length(message) between 5 and 2000),
  created_at timestamptz not null default now()
);
alter table public.contact_enquiries enable row level security;
create policy "public can submit contact enquiry" on public.contact_enquiries for insert to anon, authenticated with check (true);
create policy "staff can review contact enquiries" on public.contact_enquiries for select to authenticated using ((select private.is_staff_or_admin()));
grant insert on public.contact_enquiries to anon, authenticated;
grant select on public.contact_enquiries to authenticated;

-- Private bucket. Object names follow: <auth-user-id>/<request-uuid>/<unique-file-name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-documents', 'request-documents', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create policy "customers upload documents to own requests" on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.service_requests r where r.id::text = (storage.foldername(name))[2] and r.customer_id = (select auth.uid()))
);
create policy "customers and staff read authorized request documents" on storage.objects for select to authenticated
using (
  bucket_id = 'request-documents'
  and (
    (select private.is_staff_or_admin())
    or ((storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.service_requests r where r.id::text = (storage.foldername(name))[2] and r.customer_id = (select auth.uid())))
  )
);

-- Seed the currently confirmed catalogue. Prices and timelines stay unset until supplied by the business.
insert into public.services (category_id, slug, name, short_description, description, fulfilment_type, price_is_public, requirements, process_steps)
select c.id, v.slug, v.name, v.short_description, v.description, v.fulfilment_type::public.fulfilment_type, false, '[]'::jsonb, '[]'::jsonb
from (values
 ('business-registration','business-name-registration','Business Name Registration','Guidance and assistance with the business name registration process.','Support navigating the applicable business name registration requirements and filing process.','direct'),
 ('business-registration','company-registration','Company Registration','Support through company incorporation and documentation requirements.','Assistance understanding company incorporation options, documentation and applicable filing steps.','quote'),
 ('business-registration','ngo-registration','NGO Registration','Guidance for eligible not-for-profit registration pathways.','Initial guidance for organizations considering incorporated trustee registration, subject to applicable requirements.','consultation'),
 ('business-registration','incorporated-trustee-registration','Incorporated Trustee Registration','Assistance understanding incorporated trustee registration.','Guidance on applicable requirements and official processes for incorporated trustee registration.','consultation'),
 ('business-registration','annual-returns-filing','Annual Returns Filing','Assistance understanding and preparing applicable annual returns filings.','Support with annual returns requirements and preparation for the relevant filing process.','direct'),
 ('business-registration','post-incorporation-services','Post-Incorporation Services','Support with selected post-incorporation compliance needs.','Enquire about available post-incorporation services and the requirements for your organization.','consultation'),
 ('nin-identity','nin-verification','NIN Verification','Enquiry support for eligible verification requests through appropriate channels.','Assistance is subject to eligibility, data protection requirements and authorized official channels.','consultation'),
 ('nin-identity','nin-retrieval','NIN Retrieval','Guidance on the official NIN retrieval process.','Information and assistance with the applicable official retrieval process.','consultation'),
 ('nin-identity','nin-validation','NIN Validation','Guidance for eligible NIN validation requests.','Requests are handled only through applicable authorized channels.','consultation'),
 ('nin-identity','nin-modification','NIN Modification','Guidance on official procedures for eligible NIN modifications.','Support understanding requirements for eligible name, date of birth or address correction requests.','consultation'),
 ('nin-identity','nin-slip-reprint','NIN Slip Reprint','Assistance understanding NIN slip reprint options.','Guidance on the applicable official reprint process and requirements.','consultation'),
 ('nin-identity','nin-plastic-id-support','NIN Plastic ID Support','Enquiry support for available plastic identity card services.','Availability and eligibility depend on current official channels and procedures.','consultation'),
 ('nin-identity','bvn-verification','BVN Verification','Enquiry support for eligible BVN verification needs.','Any BVN-related assistance is subject to applicable consent, privacy safeguards and authorized channels.','consultation'),
 ('nin-identity','suspended-nin-resolution','Suspended NIN Resolution','Guidance on official channels for suspended NIN issues.','Support understanding the appropriate official escalation and resolution process; outcomes are not guaranteed.','consultation'),
 ('documents-certificates','birth-certificate-assistance','Birth Certificate Assistance','Guidance on applicable birth certificate documentation processes.','Assistance understanding the process and documentation requirements through appropriate channels.','consultation'),
 ('documents-certificates','citizenship-certificate-assistance','Citizenship Certificate Assistance','Guidance on citizenship certificate documentation processes.','Initial guidance on applicable requirements and official procedures.','consultation'),
 ('documents-certificates','waec-certificate-retrieval','WAEC Certificate Retrieval','Guidance on official WAEC certificate retrieval options.','Assistance understanding available official retrieval channels and requirements.','consultation'),
 ('documents-certificates','neco-certificate-retrieval','NECO Certificate Retrieval','Guidance on official NECO certificate retrieval options.','Assistance understanding available official retrieval channels and requirements.','consultation'),
 ('intellectual-property','trademark-search','Trademark Search','Initial trademark search support.','Preliminary search assistance and guidance on next steps for trademark protection.','quote'),
 ('intellectual-property','trademark-registration-assistance','Trademark Registration Assistance','Guidance and application assistance for trademark registration.','Support navigating trademark application requirements and the applicable registry process.','quote'),
 ('digital-business','google-business-profile','Google Business Profile Support','Support with setting up and improving a business profile.','Assistance with eligible Google Business Profile setup, verification guidance and optimization.','direct')
) as v(category_slug,slug,name,short_description,description,fulfilment_type)
join public.service_categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- Secure Auth profile bootstrap trigger and ensure its function is not a public RPC endpoint.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

-- Record every staff status change automatically.
create or replace function private.log_request_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.request_status_history (request_id, changed_by, old_status, new_status, note)
    values (new.id, (select auth.uid()), old.status, new.status, nullif(new.staff_note, ''));
  end if;
  return new;
end;
$$;
revoke all on function private.log_request_status_change() from public;
drop trigger if exists log_service_request_status_change on public.service_requests;
create trigger log_service_request_status_change
after update of status on public.service_requests
for each row execute procedure private.log_request_status_change();

create policy "staff can send support messages" on public.support_messages for insert to authenticated
with check (sender_id = (select auth.uid()) and (select private.is_staff_or_admin()) and request_id is not null);

alter table public.service_requests add column if not exists documents_requested boolean not null default false;
grant update (status, staff_note, quoted_amount_kobo, documents_requested, updated_at) on public.service_requests to authenticated;

-- Sensitive files can be uploaded only after staff explicitly opens the document-submission step.
drop policy if exists "customer add docs to own request" on public.request_documents;
create policy "customer add requested docs to own request" on public.request_documents for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and storage_bucket = 'request-documents'
  and exists (
    select 1 from public.service_requests r
    where r.id = request_id and r.customer_id = (select auth.uid()) and r.documents_requested = true
  )
);
drop policy if exists "customers upload documents to own requests" on storage.objects;
create policy "customers upload requested documents to own requests" on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.service_requests r
    where r.id::text = (storage.foldername(name))[2]
      and r.customer_id = (select auth.uid())
      and r.documents_requested = true
  )
);

alter table public.request_documents
  add constraint request_documents_bucket_check check (storage_bucket = 'request-documents'),
  add constraint request_documents_mime_check check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  add constraint request_documents_size_check check (file_size_bytes <= 10485760);
