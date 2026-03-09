
-- Add address columns to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip_code text;

-- Create group_fees table
CREATE TABLE IF NOT EXISTS public.group_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric NOT NULL,
  fee_type text NOT NULL DEFAULT 'mandatory',
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage group fees"
  ON public.group_fees FOR ALL
  USING (has_role_in_group(auth.uid(), group_id, 'admin'::app_role))
  WITH CHECK (has_role_in_group(auth.uid(), group_id, 'admin'::app_role));

CREATE POLICY "Members can view group fees"
  ON public.group_fees FOR SELECT
  USING (is_member_of_group(auth.uid(), group_id));
