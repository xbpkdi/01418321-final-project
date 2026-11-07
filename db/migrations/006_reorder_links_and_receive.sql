-- Feature 002 / reorder fixes
-- One supplier reorder can cover several Orders of the same SKU (UC 6A), and
-- the Admin records when the goods arrive (UC 6A, receive step).

-- UC 6A: link every covered Order to its reorder. An Order waits on at most
-- one reorder at a time, so the link is a nullable column on orders (1 reorder
-- : N orders) instead of a join table. Deleting a reorder (UC 10A) only
-- detaches the Orders.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS reorder_id TEXT
    REFERENCES reorders(reorder_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_reorder_idx ON orders(reorder_id);

-- Carry the old single link over before dropping it.
UPDATE orders o
SET reorder_id = r.reorder_id
FROM reorders r
WHERE r.order_id = o.order_id AND o.reorder_id IS NULL;

ALTER TABLE reorders DROP COLUMN IF EXISTS order_id;

-- UC 6A receive step: quantity actually delivered by the Supplier. Set once
-- together with received_at when the status becomes 'ได้รับสินค้าแล้ว'.
ALTER TABLE reorders
  ADD COLUMN IF NOT EXISTS received_qty INTEGER CHECK (
    received_qty IS NULL OR received_qty > 0
  );
