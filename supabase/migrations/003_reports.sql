begin;
create or replace function public.portal_collections_by_month() returns table(month text,amount_paise bigint) language sql stable security invoker as $$
 with months as (select generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month') as month),collections as(select paid_at,amount_paise from public.payments union all select paid_at,amount_paise from public.legacy_payments)
 select to_char(m.month,'YYYY-MM'),coalesce(sum(c.amount_paise),0)::bigint from months m left join collections c on date_trunc('month',c.paid_at)=m.month group by m.month order by m.month
$$;
revoke all on function public.portal_collections_by_month() from public,anon;
grant execute on function public.portal_collections_by_month() to authenticated;
commit;
