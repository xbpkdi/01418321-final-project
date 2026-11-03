-- Feature 002 / Phase 4
-- Durable state required by UC 2A, 4A, and 7A. These fields were previously
-- kept only in the browser AppState and are documented as ER extensions.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS manual_reason TEXT CHECK (manual_reason IN (
    'incomplete',
    'sku-unregistered',
    'sku-rule',
    'rsl',
    'template',
    'address',
    'price',
    'supplier',
    'stock-deduct'
  )),
  ADD COLUMN IF NOT EXISTS customer_cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edit_log JSONB NOT NULL DEFAULT '[]'::jsonb;
