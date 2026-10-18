-- Release prerequisite. REVIEW AND APPROVE before applying to a live database.
-- Additive schema/RPC only: no catalogue seed, price reset, image deletion or order deletion.
BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS buttercream_minimum_cents integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fondant_minimum_cents integer;
CREATE TABLE IF NOT EXISTS public.pricing_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_change_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pricing_change_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pricing_change_audit TO service_role;

CREATE OR REPLACE FUNCTION public.admin_save_pricing_v2(p_actor uuid, p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p public.products%ROWTYPE;
  live_choices jsonb;
  expected_choices jsonb;
  next_choices jsonb := p_payload->'choices';
  before_state jsonb;
  canonical constant uuid := '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b';
  cake_category constant uuid := '382b2742-6d74-4a4c-9a1f-dabaf5755a2d';
  base_price integer;
  deposit integer;
  buttercream integer;
  fondant integer;
BEGIN
  -- Called only by the role-checked server using its service-role client.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_actor AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO STRICT p FROM public.products WHERE id = (p_payload->>'id')::uuid FOR UPDATE;
  IF p.updated_at IS DISTINCT FROM (p_payload->>'updated_at')::timestamptz THEN
    RAISE EXCEPTION 'Pricing changed. Reload before saving.';
  END IF;
  IF p.id <> canonical AND p.category_id = cake_category THEN
    RAISE EXCEPTION 'Design listings inherit Custom celebration cake pricing.';
  END IF;
  PERFORM 1 FROM public.product_option_groups WHERE product_id = p.id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.product_option_choices c WHERE c.group_id IN
    (SELECT id FROM public.product_option_groups WHERE product_id = p.id) ORDER BY c.id FOR UPDATE;
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) INTO live_choices
    FROM public.product_option_choices c WHERE c.group_id IN
    (SELECT id FROM public.product_option_groups WHERE product_id = p.id);
  IF jsonb_typeof(p_payload->'expected_choices') IS DISTINCT FROM 'array'
     OR jsonb_typeof(next_choices) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid choice snapshot';
  END IF;
  SELECT coalesce(jsonb_agg(e ORDER BY e->>'id'), '[]'::jsonb) INTO expected_choices
    FROM jsonb_array_elements(p_payload->'expected_choices') e;
  IF live_choices IS DISTINCT FROM expected_choices THEN
    RAISE EXCEPTION 'Choices changed. Reload before saving.';
  END IF;
  IF jsonb_array_length(next_choices) <> jsonb_array_length(live_choices)
    OR (SELECT count(DISTINCT e->>'id') FROM jsonb_array_elements(next_choices) e) <> jsonb_array_length(live_choices)
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(next_choices) e
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(live_choices) old WHERE old->>'id' = e->>'id')
        OR (e->>'price_delta_cents') IS NULL OR (e->>'price_delta_cents') !~ '^-?[0-9]+$'
        OR (e->>'price_delta_cents')::bigint NOT BETWEEN -100000 AND 10000000) THEN
    RAISE EXCEPTION 'Invalid choices';
  END IF;
  base_price := (p_payload->>'price_cents')::integer;
  deposit := (p_payload->>'deposit_percent')::integer;
  buttercream := (p_payload->>'buttercream_minimum_cents')::integer;
  fondant := (p_payload->>'fondant_minimum_cents')::integer;
  IF base_price IS NULL OR base_price NOT BETWEEN 0 AND 10000000
    OR deposit IS NULL OR deposit NOT BETWEEN 1 AND 100
    OR coalesce(p_payload->>'payment_rule', '') NOT IN ('full', 'deposit') THEN
    RAISE EXCEPTION 'Invalid price or deposit';
  END IF;
  IF p.id = canonical AND (p.category_id IS DISTINCT FROM cake_category
    OR p_payload->>'payment_rule' <> 'deposit' OR buttercream IS NULL OR fondant IS NULL
    OR buttercream NOT BETWEEN 1 AND 10000000 OR fondant NOT BETWEEN 1 AND 10000000) THEN
    RAISE EXCEPTION 'The custom cake requires its protected collection, deposit and minimums.';
  END IF;
  before_state := jsonb_build_object('product', to_jsonb(p), 'choices', live_choices);
  UPDATE public.products SET
    price_cents = base_price,
    payment_rule = (p_payload->>'payment_rule')::public.payment_rule,
    pricing_mode = (CASE WHEN p_payload->>'payment_rule' = 'deposit' THEN 'deposit' ELSE 'fixed' END)::public.pricing_mode,
    deposit_percent = CASE WHEN p_payload->>'payment_rule' = 'deposit' THEN deposit ELSE NULL END,
    deposit_cents = NULL,
    buttercream_minimum_cents = CASE WHEN p.id = canonical THEN buttercream ELSE p.buttercream_minimum_cents END,
    fondant_minimum_cents = CASE WHEN p.id = canonical THEN fondant ELSE p.fondant_minimum_cents END,
    updated_at = clock_timestamp()
  WHERE id = p.id;
  UPDATE public.product_option_choices c SET price_delta_cents = (e->>'price_delta_cents')::integer,
    updated_at = clock_timestamp() FROM jsonb_array_elements(next_choices) e WHERE c.id = (e->>'id')::uuid;
  INSERT INTO public.pricing_change_audit(actor_id, product_id, before_state, after_state)
    SELECT p_actor, p.id, before_state, jsonb_build_object('product', to_jsonb(updated), 'choices', next_choices)
    FROM public.products updated WHERE updated.id = p.id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_pricing_v2(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_pricing_v2(uuid,jsonb) TO service_role;
COMMIT;
