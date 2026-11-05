-- Feature 002 / T011
-- Runtime records approved by FR-017 and documented in data-model.md.
-- Session statements belong to UC 1A; other tables name their owning UC below.

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(admin_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS sessions_admin_id_idx ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS sessions_active_token_idx
  ON sessions(token_hash, expires_at)
  WHERE revoked_at IS NULL;

-- UC 2S/3S/6S/7S automatic alternative-flow errors.
CREATE TABLE IF NOT EXISTS auto_error_logs (
  auto_error_log_id TEXT PRIMARY KEY,
  use_case_id TEXT NOT NULL,
  context_key TEXT NOT NULL,
  error_code TEXT NOT NULL,
  safe_message TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UC 10A deletion audit.
CREATE TABLE IF NOT EXISTS deletion_history (
  deletion_history_id TEXT PRIMARY KEY,
  order_reference TEXT NOT NULL,
  order_snapshot JSONB NOT NULL,
  admin_id TEXT NOT NULL REFERENCES admins(admin_id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UC 4S cost changes and the exchange-rate freshness required by its alternatives.
ALTER TABLE costs
  ADD COLUMN IF NOT EXISTS exchange_rate_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS cost_history (
  cost_history_id TEXT PRIMARY KEY,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  cost_id TEXT REFERENCES costs(cost_id),
  previous_value JSONB,
  new_value JSONB NOT NULL,
  admin_id TEXT NOT NULL REFERENCES admins(admin_id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UC 5S normal notification and confirmed resend attempts.
CREATE TABLE IF NOT EXISTS tracking_notification_logs (
  tracking_notification_log_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  outcome TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  admin_id TEXT REFERENCES admins(admin_id)
);

-- UC 7S alternative #1 durable Rakuten stock-sync state.
CREATE TABLE IF NOT EXISTS rakuten_stock_sync_states (
  stock_id TEXT PRIMARY KEY REFERENCES stock(stock_id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced')),
  last_synced_qty INTEGER CHECK (last_synced_qty IS NULL OR last_synced_qty >= 0),
  last_attempt_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_error_code TEXT
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

