CREATE TYPE public.simplified_payment AS (
    payer_id UUID,
    receiver_id UUID,
    amount NUMERIC
);