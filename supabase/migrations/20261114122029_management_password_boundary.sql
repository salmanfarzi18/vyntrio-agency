begin;
alter table public.agencies add column management_mfa_method text not null default 'totp' check(management_mfa_method in ('totp','phone'));
-- A mailbox link plus MFA is sufficient only for account recovery. Agency
-- business records require a signed password AMR claim as well as AAL2.
-- Keep existing caller-bound membership checks and grants unchanged.
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]'::jsonb end) method where method->>'method'='password' or method='"password"'::jsonb)
 and exists(select 1 from public.memberships m join public.agencies a on a.id=m.agency_id where m.user_id=auth.uid() and m.agency_id='11111111-1111-4111-8111-111111111111' and (a.management_mfa_method='totp' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]'::jsonb end) method where method->>'method'='mfa/phone' or method='"mfa/phone"'::jsonb)) and m.role in('owner','admin','staff'))
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]'::jsonb end) method where method->>'method'='password' or method='"password"'::jsonb)
 and exists(select 1 from public.memberships m join public.agencies a on a.id=m.agency_id where m.user_id=auth.uid() and m.agency_id='11111111-1111-4111-8111-111111111111' and (a.management_mfa_method='totp' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]'::jsonb end) method where method->>'method'='mfa/phone' or method='"mfa/phone"'::jsonb)) and m.role in('owner','admin'))
$$;
revoke all on function public.is_staff(),public.is_admin() from public,anon;
grant execute on function public.is_staff(),public.is_admin() to authenticated,service_role;
commit;
