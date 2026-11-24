-- REVIEW ONLY. Apply to isolated staging after integration review, not production.
-- Keep this aligned with src/lib/order-status.ts and Stripe webhook transitions.
CREATE OR REPLACE FUNCTION public.enforce_order_payment_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.checkout_method = 'bank_transfer' AND NEW.payment_status <> 'not_paid' THEN
      RAISE EXCEPTION 'Bank transfer orders must begin unpaid';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.payment_status = 'not_paid' AND NEW.payment_status = 'pending_verification'
      AND OLD.checkout_method = 'bank_transfer'
      AND NEW.slip_path IS NOT NULL)
    OR (OLD.payment_status = 'pending_verification' AND NEW.payment_status IN ('paid', 'not_paid'))
    OR (OLD.payment_status = 'pending' AND NEW.payment_status IN ('paid', 'expired', 'failed', 'not_paid'))
    OR (OLD.payment_status = 'expired' AND NEW.payment_status IN ('not_paid', 'paid'))
    OR (OLD.payment_status = 'failed' AND NEW.payment_status IN ('not_paid', 'paid'))
    OR (OLD.payment_status = 'paid' AND NEW.payment_status = 'refunded')
  ) THEN
    RAISE EXCEPTION 'Invalid payment status transition from % to %',
      OLD.payment_status, NEW.payment_status;
  END IF;

  IF NEW.checkout_method <> 'card' AND NEW.payment_status IN ('pending', 'expired', 'failed') THEN
    RAISE EXCEPTION 'Stripe-only payment status on non-card order';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_payment_transition ON public.orders;
CREATE TRIGGER enforce_order_payment_transition
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_payment_transition();
