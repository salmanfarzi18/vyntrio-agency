const fs=require('fs');const sql=fs.readFileSync('supabase/migrations/001_portal.sql','utf8');
const table=sql.match(/create table public\.project_members[^\n]+/)[0].replace('create table','create table if not exists');
const functions=[...sql.matchAll(/create function public\.(?:is_staff|is_admin|owns_project|can_read_project)\([^]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));
const policies=[...sql.matchAll(/create policy (\w+) on public\.(\w+) [^\n]+/g)].map(m=>`drop policy if exists ${m[1]} on public.${m[2]};\n${m[0]}`);
const upgrade=['begin;',table,'alter table public.project_members enable row level security;','revoke all on public.project_members from anon,authenticated;','grant select on public.project_members to authenticated;','grant all on public.project_members to service_role;',...functions,...policies,'revoke all on function public.is_admin() from public,anon;','grant execute on function public.is_admin() to authenticated,service_role;','commit;'].join('\n');
fs.writeFileSync('supabase/migrations/002_team_access_upgrade.sql',upgrade);
