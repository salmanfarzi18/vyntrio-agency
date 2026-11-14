-- New reservations use a whole-second 30-minute checkout window.
-- Existing orders and payment statuses are deliberately unchanged.
begin;
alter table public.payment_orders alter column expires_at
  set default date_trunc('second', now() + interval '30 minutes');
commit;
