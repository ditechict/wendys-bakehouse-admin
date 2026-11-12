-- Applied to isolated Wendy's Bakehouse staging on 2026-11-12.
-- Do not apply to production until the application release is validated.
create or replace function public.enforce_order_payment_transition()
returns trigger language plpgsql set search_path = public as $$
declare allowed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.checkout_method = 'bank_transfer' and new.payment_status <> 'not_paid' then
      raise exception 'Bank transfer orders must start unpaid';
    end if;
    if new.checkout_method = 'card' and new.payment_status <> 'pending' then
      raise exception 'Card orders must start pending';
    end if;
    return new;
  end if;
  if new.payment_status is not distinct from old.payment_status then return new; end if;
  if old.checkout_method = 'card' then
    allowed := (old.payment_status = 'pending' and new.payment_status in ('paid','expired','failed','not_paid'))
      or (old.payment_status in ('expired','failed') and new.payment_status = 'paid')
      or (old.payment_status = 'paid' and new.payment_status = 'refunded');
  else
    allowed := (old.payment_status = 'not_paid' and new.payment_status = 'pending_verification' and new.slip_path is not null)
      or (old.payment_status = 'pending_verification' and new.payment_status in ('paid','not_paid'))
      or (old.payment_status = 'paid' and new.payment_status = 'refunded');
  end if;
  if not allowed then raise exception 'Disallowed payment transition: % -> %', old.payment_status, new.payment_status; end if;
  return new;
end;
$$;
drop trigger if exists enforce_order_payment_transition on public.orders;
create trigger enforce_order_payment_transition
before insert or update on public.orders for each row
execute function public.enforce_order_payment_transition();
