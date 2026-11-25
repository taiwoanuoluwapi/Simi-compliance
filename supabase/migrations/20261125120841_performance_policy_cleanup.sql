-- Index foreign-key columns used for joins and RLS; consolidate overlapping policies.
create index if not exists payments_request_id_idx on public.payments(request_id);
create index if not exists request_documents_uploaded_by_idx on public.request_documents(uploaded_by);
create index if not exists request_status_history_request_id_idx on public.request_status_history(request_id);
create index if not exists request_status_history_changed_by_idx on public.request_status_history(changed_by);
create index if not exists service_requests_service_id_idx on public.service_requests(service_id);
create index if not exists support_messages_request_id_idx on public.support_messages(request_id);
create index if not exists support_messages_sender_id_idx on public.support_messages(sender_id);

drop policy if exists "staff read payment records" on public.payments;
drop policy if exists "admin update profiles" on public.profiles;

drop policy if exists "admin manage categories" on public.service_categories;
create policy "admin insert categories" on public.service_categories for insert to authenticated
with check ((select private.is_admin()));
create policy "admin update categories" on public.service_categories for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete categories" on public.service_categories for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "admin manage services" on public.services;
create policy "admin insert services" on public.services for insert to authenticated
with check ((select private.is_admin()));
create policy "admin update services" on public.services for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete services" on public.services for delete to authenticated
using ((select private.is_admin()));

drop policy if exists "customer send support messages" on public.support_messages;
drop policy if exists "staff can send support messages" on public.support_messages;
create policy "customers and staff send support messages" on public.support_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    request_id is null
    or exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.customer_id = (select auth.uid())
    )
    or (request_id is not null and (select private.is_staff_or_admin()))
  )
);
