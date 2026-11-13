begin;
create extension if not exists pgcrypto;

create table public.agencies(id uuid primary key default gen_random_uuid(),name text not null,created_at timestamptz not null default now());
insert into public.agencies(id,name) values('11111111-1111-4111-8111-111111111111','VYNTRIO Agency');
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text not null,full_name text not null default '',phone text not null default '',created_at timestamptz not null default now());
create unique index profiles_email_key on public.profiles(lower(email));
create table public.memberships(agency_id uuid not null references public.agencies(id),user_id uuid not null references public.profiles(id) on delete cascade,role text not null check(role in('owner','admin','staff')),primary key(agency_id,user_id));
create table public.inquiries(
 id uuid primary key default gen_random_uuid(),reference text not null unique,agency_id uuid not null default '11111111-1111-4111-8111-111111111111' references public.agencies(id),
 user_id uuid references public.profiles(id),name text not null,email text not null,phone text not null,project_type text not null,details text not null,
 consent boolean not null check(consent),status text not null default 'new' check(status in('new','contacted','quoted','converted','closed')),
 payment_status text not null default 'pending' check(payment_status in('pending','paid','not_required')),request_hash text,created_at timestamptz not null default now()
);
create table public.projects(
 id uuid primary key default gen_random_uuid(),agency_id uuid not null default '11111111-1111-4111-8111-111111111111' references public.agencies(id),
 client_id uuid not null references public.profiles(id),inquiry_id uuid references public.inquiries(id),title text not null,description text not null default '',
 status text not null default 'planning' check(status in('planning','design','development','testing','launched','on_hold','completed')),
 budget_paise bigint not null default 0 check(budget_paise>=0),due_date date,created_at timestamptz not null default now()
);
create table public.project_members(project_id uuid not null references public.projects(id) on delete cascade,user_id uuid not null references public.profiles(id),primary key(project_id,user_id));
create table public.milestones(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,title text not null,description text not null default '',due_date date,position integer not null default 0,status text not null default 'planned' check(status in('planned','in_progress','ready_for_review','approved')),approved_at timestamptz,approved_by uuid references public.profiles(id),created_at timestamptz not null default now());
create table public.updates(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,author_id uuid not null references public.profiles(id),body text not null,internal boolean not null default false,created_at timestamptz not null default now());
create table public.quotes(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),title text not null,scope text not null,amount_paise bigint not null check(amount_paise>0),status text not null default 'sent' check(status in('sent','accepted','declined','withdrawn')),responded_at timestamptz,created_at timestamptz not null default now());
create table public.invoices(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),title text not null,amount_paise bigint not null check(amount_paise>0),due_date date,status text not null default 'pending' check(status in('pending','paid','cancelled')),created_at timestamptz not null default now());
create table public.payment_orders(order_id text primary key,inquiry_id uuid references public.inquiries(id),invoice_id uuid references public.invoices(id),amount_paise bigint not null check(amount_paise>0),idempotency_key uuid not null default gen_random_uuid(),expires_at timestamptz not null default now()+interval '15 minutes',status text not null default 'pending' check(status in('pending','paid','error')),created_at timestamptz not null default now(),check((inquiry_id is not null)::int+(invoice_id is not null)::int=1));
create unique index one_pending_invoice_order on public.payment_orders(invoice_id) where status='pending';
create unique index one_pending_inquiry_order on public.payment_orders(inquiry_id) where status='pending';
create table public.payments(id uuid primary key default gen_random_uuid(),order_id text not null references public.payment_orders(order_id),cashfree_payment_id text not null unique,amount_paise bigint not null check(amount_paise>0),currency text not null default 'INR' check(currency='INR'),paid_at timestamptz not null,verified_by text not null,created_at timestamptz not null default now());
create table public.legacy_payments(id uuid primary key default gen_random_uuid(),order_id text not null unique,cashfree_payment_id text not null unique,amount_paise bigint not null,customer_name text,customer_email text,customer_phone text,inquiry_id uuid references public.inquiries(id),match_status text not null default 'needs_review',verified_by text not null,paid_at timestamptz not null,created_at timestamptz not null default now());
create table public.files(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),uploaded_by uuid not null references public.profiles(id),name text not null,path text not null unique,size bigint not null check(size<=3145728),mime_type text not null,backup_status text not null default 'pending',backup_path text,created_at timestamptz not null default now());
create table public.tickets(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),created_by uuid not null references public.profiles(id),subject text not null,description text not null,status text not null default 'open' check(status in('open','in_progress','resolved')),created_at timestamptz not null default now());
create table public.ticket_messages(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.tickets(id),author_id uuid not null references public.profiles(id),body text not null,created_at timestamptz not null default now());
create table public.audit_log(id bigint generated always as identity primary key,actor_id uuid references public.profiles(id),action text not null,entity text not null,entity_id text,created_at timestamptz not null default now());
create table public.notification_outbox(id uuid primary key default gen_random_uuid(),event_key text not null unique,recipient text not null,subject text not null,body text not null,status text not null default 'pending' check(status in('pending','sending','sent','failed')),attempts int not null default 0,next_attempt_at timestamptz not null default now(),last_error text,created_at timestamptz not null default now(),sent_at timestamptz);
create table public.backup_runs(id uuid primary key default gen_random_uuid(),status text not null default 'running' check(status in('running','completed','failed')),object_path text,offsite_status text not null default 'pending',record_count bigint,error text,created_at timestamptz not null default now(),completed_at timestamptz);
create table public.rate_limits(key text not null,window_start timestamptz not null,requests int not null default 1,primary key(key,window_start));

create index inquiries_created_idx on public.inquiries(created_at desc);
create index inquiries_email_idx on public.inquiries(lower(email));
create index projects_client_idx on public.projects(client_id);
create index milestones_project_idx on public.milestones(project_id);
create index updates_project_idx on public.updates(project_id,created_at desc);
create index invoices_project_idx on public.invoices(project_id);
create index tickets_project_idx on public.tickets(project_id);
create index outbox_pending_idx on public.notification_outbox(status,next_attempt_at);

create function public.is_staff() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from public.memberships where user_id=auth.uid() and agency_id='11111111-1111-4111-8111-111111111111' and role in('owner','admin','staff'))$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from public.memberships where user_id=auth.uid() and agency_id='11111111-1111-4111-8111-111111111111' and role in('owner','admin'))$$;
create function public.owns_project(project uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.projects where id=project and client_id=auth.uid())$$;
create function public.can_read_project(project uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.is_admin() or public.owns_project(project) or (public.is_staff() and exists(select 1 from public.project_members where project_id=project and user_id=auth.uid()))$$;
create function public.on_auth_user() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin insert into public.profiles(id,email,full_name) values(new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do update set email=excluded.email;return new;end;$$;
create trigger auth_user_profile after insert or update of email on auth.users for each row execute function public.on_auth_user();

do $$declare t text;begin foreach t in array array['agencies','profiles','memberships','inquiries','projects','project_members','milestones','updates','quotes','invoices','payment_orders','payments','legacy_payments','files','tickets','ticket_messages','audit_log','notification_outbox','backup_runs','rate_limits'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);end loop;end;$$;
grant usage on schema public to authenticated;
grant select on public.agencies,public.profiles,public.memberships,public.inquiries,public.projects,public.project_members,public.milestones,public.updates,public.quotes,public.invoices,public.payment_orders,public.payments,public.legacy_payments,public.files,public.tickets,public.ticket_messages,public.audit_log,public.notification_outbox,public.backup_runs to authenticated;
grant update(full_name,phone) on public.profiles to authenticated;
create policy agency_read on public.agencies for select to authenticated using(public.is_staff() or exists(select 1 from public.projects where client_id=auth.uid()));
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy membership_read on public.memberships for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy inquiry_read on public.inquiries for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy project_read on public.projects for select to authenticated using(public.can_read_project(id));
create policy project_member_read on public.project_members for select to authenticated using(public.can_read_project(project_id));
create policy milestone_read on public.milestones for select to authenticated using(public.can_read_project(project_id));
create policy update_read on public.updates for select to authenticated using((public.is_staff() and public.can_read_project(project_id)) or (not internal and public.owns_project(project_id)));
create policy quote_read on public.quotes for select to authenticated using(public.is_admin() or public.owns_project(project_id));
create policy invoice_read on public.invoices for select to authenticated using(public.is_admin() or public.owns_project(project_id));
create policy order_read on public.payment_orders for select to authenticated using(public.is_admin() or exists(select 1 from public.invoices where id=invoice_id) or exists(select 1 from public.inquiries where id=inquiry_id and user_id=auth.uid()));
create policy payment_read on public.payments for select to authenticated using(exists(select 1 from public.payment_orders where payment_orders.order_id=payments.order_id));
create policy legacy_read on public.legacy_payments for select to authenticated using(public.is_admin() or exists(select 1 from public.inquiries where inquiries.id=inquiry_id and inquiries.user_id=auth.uid()));
create policy file_read on public.files for select to authenticated using(public.can_read_project(project_id));
create policy ticket_read on public.tickets for select to authenticated using(public.can_read_project(project_id));
create policy ticket_message_read on public.ticket_messages for select to authenticated using(exists(select 1 from public.tickets t where t.id=ticket_id and public.can_read_project(t.project_id)));
create policy audit_read on public.audit_log for select to authenticated using(public.is_admin());
create policy outbox_read on public.notification_outbox for select to authenticated using(public.is_admin());
create policy backup_read on public.backup_runs for select to authenticated using(public.is_admin());
revoke all on function public.is_staff(),public.is_admin(),public.owns_project(uuid),public.can_read_project(uuid) from public,anon;
grant execute on function public.is_staff(),public.is_admin(),public.owns_project(uuid),public.can_read_project(uuid) to authenticated,service_role;

create function public.consume_rate_limit(p_key text,p_limit int,p_seconds int) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare n int;w timestamptz;begin w=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);insert into public.rate_limits(key,window_start) values(p_key,w) on conflict(key,window_start) do update set requests=rate_limits.requests+1 returning requests into n;return n<=p_limit;end;$$;
revoke all on function public.consume_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,int,int) to service_role;

create function public.record_verified_payment(p_order text,p_payment text,p_amount bigint,p_paid_at timestamptz,p_source text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.payment_orders;inserted uuid;begin
 select * into o from public.payment_orders where order_id=p_order for update;
 if not found then raise exception 'Unknown payment order';end if;
 if o.amount_paise<>p_amount then raise exception 'Payment amount mismatch';end if;
 if exists(select 1 from public.payments where cashfree_payment_id=p_payment and order_id<>p_order) then raise exception 'Payment already linked';end if;
 insert into public.payments(order_id,cashfree_payment_id,amount_paise,paid_at,verified_by) values(p_order,p_payment,p_amount,p_paid_at,p_source) on conflict(cashfree_payment_id) do nothing returning id into inserted;
 if inserted is null then return jsonb_build_object('duplicate',true);end if;
 update public.payment_orders set status='paid' where order_id=p_order;
 if o.inquiry_id is not null then update public.inquiries set payment_status='paid' where id=o.inquiry_id;end if;
 if o.invoice_id is not null then update public.invoices set status='paid' where id=o.invoice_id and status<>'cancelled';end if;
 return jsonb_build_object('duplicate',false,'inquiry_id',o.inquiry_id,'invoice_id',o.invoice_id);
end;$$;
revoke all on function public.record_verified_payment(text,text,bigint,timestamptz,text) from public,anon,authenticated;
grant execute on function public.record_verified_payment(text,text,bigint,timestamptz,text) to service_role;

create function public.reserve_payment_order(p_inquiry uuid,p_invoice uuid,p_amount bigint) returns public.payment_orders language plpgsql security definer set search_path=public,pg_temp as $$declare o public.payment_orders;expected bigint;begin
 if (p_inquiry is not null)::int+(p_invoice is not null)::int<>1 then raise exception 'Choose one payment reference';end if;
 perform pg_advisory_xact_lock(hashtext(coalesce(p_inquiry,p_invoice)::text));
 if p_invoice is not null then select amount_paise into expected from public.invoices where id=p_invoice and status='pending';else select 100 into expected from public.inquiries where id=p_inquiry and payment_status='pending';end if;
 if expected is null or expected<>p_amount then raise exception 'Payment reference is not payable';end if;
 update public.payment_orders set status='error' where status='pending' and expires_at<now() and (inquiry_id=p_inquiry or invoice_id=p_invoice);
 select * into o from public.payment_orders where status='pending' and (inquiry_id=p_inquiry or invoice_id=p_invoice) limit 1;
 if found then return o;end if;
 insert into public.payment_orders(order_id,inquiry_id,invoice_id,amount_paise) values('vyn_'||replace(gen_random_uuid()::text,'-',''),p_inquiry,p_invoice,p_amount) returning * into o;return o;
end;$$;
revoke all on function public.reserve_payment_order(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.reserve_payment_order(uuid,uuid,bigint) to service_role;

create function public.claim_notifications(p_limit int default 10) returns setof public.notification_outbox language plpgsql security definer set search_path=public,pg_temp as $$begin
 return query update public.notification_outbox n set status='sending',attempts=attempts+1,next_attempt_at=now()+interval '10 minutes' where n.id in(select id from public.notification_outbox where (status in('pending','failed') or (status='sending' and next_attempt_at<now())) and attempts<8 and next_attempt_at<=now() order by created_at for update skip locked limit greatest(1,least(p_limit,20))) returning n.*;
end;$$;
revoke all on function public.claim_notifications(int) from public,anon,authenticated;
grant execute on function public.claim_notifications(int) to service_role;

create function public.portal_summary() returns jsonb language sql stable security invoker as $$select jsonb_build_object(
 'inquiries',(select count(*) from public.inquiries),'clients',(select count(*) from public.profiles p where not exists(select 1 from public.memberships m where m.user_id=p.id)),
 'active_projects',(select count(*) from public.projects where status not in('completed','launched')),'completed_projects',(select count(*) from public.projects where status in('completed','launched')),
 'collections_paise',(select coalesce(sum(amount_paise),0) from public.payments)+(select coalesce(sum(amount_paise),0) from public.legacy_payments),
 'project_collections_paise',(select coalesce(sum(p.amount_paise),0) from public.payments p join public.payment_orders o on o.order_id=p.order_id where o.invoice_id is not null),
 'pending_paise',(select coalesce(sum(amount_paise),0) from public.invoices where status='pending'),
 'open_tickets',(select count(*) from public.tickets where status<>'resolved'),
 'overdue_milestones',(select count(*) from public.milestones where due_date<current_date and status<>'approved'),
 'email_pending',(select count(*) from public.notification_outbox where status<>'sent')
 )$$;
revoke all on function public.portal_summary() from public,anon;
grant execute on function public.portal_summary() to authenticated;

grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('project-files','project-files',false,3145728,array['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('vyntrio-backups','vyntrio-backups',false) on conflict(id) do nothing;
-- Storage access uses short-lived server-issued URLs after project ownership checks.
-- No public storage policies or client write privileges are granted.
commit;
