ALTER TABLE public.pools
  ADD COLUMN IF NOT EXISTS has_prize boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prize_type text CHECK (
    prize_type IN ('fixed', 'per_entry', null)
  ),
  ADD COLUMN IF NOT EXISTS entry_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS prize_1st_fixed numeric(10,2),
  ADD COLUMN IF NOT EXISTS prize_2nd_fixed numeric(10,2),
  ADD COLUMN IF NOT EXISTS prize_3rd_fixed numeric(10,2),
  ADD COLUMN IF NOT EXISTS prize_1st_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS prize_2nd_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS prize_3rd_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS prize_currency text DEFAULT 'USD';
