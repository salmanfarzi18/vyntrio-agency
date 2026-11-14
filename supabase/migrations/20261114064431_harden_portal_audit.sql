begin;

-- These functions reference qualified application tables; pin name resolution.
alter function public.portal_summary() set search_path=public,pg_temp;
alter function public.portal_collections_by_month() set search_path=public,pg_temp;

-- Trigger entry points are invoked by Postgres, not by browser RPC callers.
revoke all on function public.on_auth_user() from public,anon,authenticated;
do $$begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public,anon,authenticated';
  end if;
end$$;

-- Cache the caller identity once per statement without changing row ownership rules.
alter policy agency_read on public.agencies using(public.is_staff() or exists(select 1 from public.projects where client_id=(select auth.uid())));
alter policy profile_read on public.profiles using(id=(select auth.uid()) or public.is_admin());
alter policy profile_update on public.profiles using(id=(select auth.uid())) with check(id=(select auth.uid()));
alter policy membership_read on public.memberships using(user_id=(select auth.uid()) or public.is_admin());
alter policy inquiry_read on public.inquiries using(user_id=(select auth.uid()) or public.is_admin());
alter policy order_read on public.payment_orders using(public.is_admin() or exists(select 1 from public.invoices where id=invoice_id) or exists(select 1 from public.inquiries where id=inquiry_id and user_id=(select auth.uid())));
alter policy legacy_read on public.legacy_payments using(public.is_admin() or exists(select 1 from public.inquiries where inquiries.id=inquiry_id and inquiries.user_id=(select auth.uid())));

-- Cover relationship lookups used by permissions, project views and reconciliation.
create index if not exists audit_log_actor_idx on public.audit_log(actor_id);
create index if not exists files_project_idx on public.files(project_id);
create index if not exists files_uploader_idx on public.files(uploaded_by);
create index if not exists inquiries_agency_idx on public.inquiries(agency_id);
create index if not exists inquiries_user_idx on public.inquiries(user_id);
create index if not exists legacy_inquiry_idx on public.legacy_payments(inquiry_id);
create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists milestones_approver_idx on public.milestones(approved_by);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists project_members_user_idx on public.project_members(user_id);
create index if not exists projects_agency_idx on public.projects(agency_id);
create index if not exists projects_inquiry_idx on public.projects(inquiry_id);
create index if not exists quotes_project_idx on public.quotes(project_id);
create index if not exists ticket_messages_author_idx on public.ticket_messages(author_id);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages(ticket_id);
create index if not exists tickets_creator_idx on public.tickets(created_by);
create index if not exists updates_author_idx on public.updates(author_id);

commit;
