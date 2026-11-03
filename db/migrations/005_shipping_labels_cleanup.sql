-- Feature 002 / Phase 6
-- Durable label-print, carrier, tracking-notification, and cleanup state.

-- UC 8A needs the carrier's last confirmed state independently from the
-- Order workflow status. In particular, a delivered parcel can still be
-- waiting for 5S/7S before the Order is allowed to close.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_status TEXT CHECK (
    delivery_status IS NULL OR delivery_status IN (
      'in_transit', 'delivered', 'failed', 'returned'
    )
  );

UPDATE orders
SET delivery_status = CASE
  WHEN order_status = 'จัดส่งสำเร็จ' THEN 'delivered'
  WHEN order_status = 'จัดส่งไม่สำเร็จ' THEN 'failed'
  WHEN order_status = 'ตีกลับ/คืนสินค้า' THEN 'returned'
  WHEN tracking_number IS NOT NULL THEN 'in_transit'
  ELSE NULL
END
WHERE delivery_status IS NULL;

-- UC 9A alternatives #2/#3: every printer call is an append-only attempt.
CREATE TABLE IF NOT EXISTS label_print_history (
  label_print_history_id TEXT PRIMARY KEY,
  print_attempt_id TEXT NOT NULL,
  label_id TEXT NOT NULL REFERENCES labels(label_id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES admins(admin_id),
  is_reprint BOOLEAN NOT NULL DEFAULT FALSE,
  outcome TEXT NOT NULL CHECK (outcome IN ('printed', 'failed')),
  error_code TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (print_attempt_id, label_id)
);

CREATE INDEX IF NOT EXISTS label_print_history_label_idx
  ON label_print_history(label_id, attempted_at DESC);

-- UC 5S retries reuse an attempt id; a confirmed resend gets a new id.
ALTER TABLE tracking_notification_logs
  ADD COLUMN IF NOT EXISTS attempt_id TEXT,
  ADD COLUMN IF NOT EXISTS error_code TEXT;

UPDATE tracking_notification_logs
SET attempt_id = tracking_notification_log_id
WHERE attempt_id IS NULL;

ALTER TABLE tracking_notification_logs
  ALTER COLUMN attempt_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tracking_notification_attempt_idx
  ON tracking_notification_logs(attempt_id);
