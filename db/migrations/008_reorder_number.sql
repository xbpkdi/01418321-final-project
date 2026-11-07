-- Feature 002 / UC 6A
-- PO numbers use the running format shown in the report (PO-0091, PO-0092, ...)
-- instead of PO-<uuid>. A sequence never hands out the same number twice, so a
-- number is not reused even after UC 10A deletes the newest reorder.
CREATE SEQUENCE IF NOT EXISTS reorder_no_seq MINVALUE 1;

-- Continue after the highest PO-<number> already stored. Older PO-<uuid> rows
-- do not match the pattern and are ignored.
SELECT setval(
  'reorder_no_seq',
  COALESCE((
    SELECT MAX(substring(reorder_id FROM '^PO-([0-9]+)$')::bigint)
    FROM reorders
  ), 0) + 1,
  false
);
