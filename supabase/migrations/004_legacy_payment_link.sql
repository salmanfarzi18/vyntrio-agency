begin;
create or replace function public.link_legacy_payment(p_payment uuid,p_reference text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare payment public.legacy_payments;inquiry public.inquiries;
begin
 select * into payment from public.legacy_payments where id=p_payment for update;
 if not found or payment.amount_paise<>100 then raise exception 'Choose a verified inquiry payment';end if;
 select * into inquiry from public.inquiries where reference=p_reference for update;
 if not found then raise exception 'Inquiry reference not found';end if;
 if payment.inquiry_id=inquiry.id then return inquiry.id;end if;
 if payment.inquiry_id is not null then raise exception 'Payment already linked';end if;
 if inquiry.payment_status<>'pending' then raise exception 'Inquiry already has a payment status';end if;
 update public.legacy_payments set inquiry_id=inquiry.id,match_status='matched_by_admin' where id=payment.id;
 update public.inquiries set payment_status='paid' where id=inquiry.id;
 return inquiry.id;
end;$$;
revoke all on function public.link_legacy_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.link_legacy_payment(uuid,text) to service_role;
commit;
