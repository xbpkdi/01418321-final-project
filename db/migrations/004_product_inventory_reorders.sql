-- Feature 002 / Phase 5
-- Durable product, inventory, cost, and supplier-order state for UC 3A-6A.

-- UC 3S manual inventory adjustments. The current quantity remains in stock;
-- this append-only table keeps the actor and before/after values.
CREATE TABLE IF NOT EXISTS stock_adjustment_history (
  stock_adjustment_history_id TEXT PRIMARY KEY,
  stock_id TEXT NOT NULL REFERENCES stock(stock_id) ON DELETE CASCADE,
  previous_in_house_qty INTEGER NOT NULL CHECK (previous_in_house_qty >= 0),
  new_in_house_qty INTEGER NOT NULL CHECK (new_in_house_qty >= 0),
  previous_rsl_qty INTEGER CHECK (previous_rsl_qty IS NULL OR previous_rsl_qty >= 0),
  new_rsl_qty INTEGER CHECK (new_rsl_qty IS NULL OR new_rsl_qty >= 0),
  reason TEXT NOT NULL,
  admin_id TEXT NOT NULL REFERENCES admins(admin_id),
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS stock_adjustment_history_stock_idx
  ON stock_adjustment_history(stock_id, adjusted_at DESC);

-- UC 5A stores the Admin decision on the Order until UC 6A creates the
-- supplier-facing reorder record.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS reorder_decision TEXT CHECK (
    reorder_decision IS NULL OR reorder_decision IN ('คุ้มค่า', 'ไม่คุ้มค่า')
  ),
  ADD COLUMN IF NOT EXISTS decided_qty INTEGER CHECK (
    decided_qty IS NULL OR decided_qty > 0
  );

-- UC 6A retries reuse supplier_request_id. The external reference and last
-- safe error make accepted/failure outcomes durable across restarts.
ALTER TABLE reorders
  ADD COLUMN IF NOT EXISTS supplier_request_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS supplier_reference TEXT,
  ADD COLUMN IF NOT EXISTS last_error_code TEXT;
