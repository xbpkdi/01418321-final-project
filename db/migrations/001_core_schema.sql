-- Feature 002 / T010
-- Core schema follows docs/source/er-diagram.drawio.xml.
-- Q-numbers remain provisional until the revised use-case document arrives.

CREATE TABLE IF NOT EXISTS admins (
  admin_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  user_password TEXT NOT NULL,
  fail_attempts INTEGER NOT NULL DEFAULT 0 CHECK (fail_attempts >= 0),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  lead_time_days INTEGER NOT NULL CHECK (lead_time_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skus (
  sku_id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  variation TEXT NOT NULL,
  sales_channel TEXT NOT NULL CHECK (sales_channel = 'Rakuten Ichiba'),
  channel_sku TEXT NOT NULL UNIQUE,
  selling_price NUMERIC(14, 2),
  reorder_threshold INTEGER NOT NULL CHECK (reorder_threshold >= 0),
  reorder_qty INTEGER NOT NULL CHECK (reorder_qty >= 0),
  sku_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  supplier_id TEXT REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS stock (
  stock_id TEXT PRIMARY KEY,
  in_house_qty INTEGER NOT NULL CHECK (in_house_qty >= 0),
  rsl_qty INTEGER CHECK (rsl_qty IS NULL OR rsl_qty >= 0),
  updated_at TIMESTAMPTZ NOT NULL,
  sku_id TEXT NOT NULL UNIQUE REFERENCES skus(sku_id)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  marketplace_order_id TEXT NOT NULL UNIQUE,
  sales_channel TEXT NOT NULL CHECK (sales_channel = 'Rakuten Ichiba'),
  order_date TIMESTAMPTZ NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_method TEXT NOT NULL,
  order_status TEXT NOT NULL CHECK (order_status IN (
    'รอตรวจสอบคำสั่งซื้อ',
    'รอจับคู่กฎ SKU',
    'รอตรวจสอบสต๊อก',
    'รอ Admin ตัดสินใจสั่งซื้อ',
    'รอสั่งซื้อจาก Supplier',
    'สั่งซื้อแล้ว',
    'ยังไม่ได้จับคู่',
    'รอจัดรูปแบบใบปะสินค้า',
    'รอพิมพ์ใบปะสินค้า',
    'พิมพ์ใบปะสินค้าแล้ว',
    'รอส่งคำสั่งซื้อ',
    'รอส่งมอบ',
    'อยู่ระหว่างจัดส่ง',
    'รอแจ้งเลขติดตาม',
    'แจ้งเลขติดตามแล้ว',
    'จัดส่งสำเร็จ',
    'จัดส่งไม่สำเร็จ',
    'ตีกลับ/คืนสินค้า',
    'รอยกเลิก Order',
    'ยกเลิกแล้ว',
    'รอดำเนินการด้วยตนเอง',
    'รอดำเนินการพิเศษ'
  )),
  rsl_no TEXT,
  rsl_matched_at TIMESTAMPTZ,
  tracking_number TEXT,
  carrier_name TEXT,
  dispatched_at TIMESTAMPTZ,
  tracking_notified BOOLEAN NOT NULL DEFAULT FALSE,
  tracking_notified_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id TEXT PRIMARY KEY,
  channel_sku TEXT NOT NULL,
  variation TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty >= 0),
  fulfill_source TEXT NOT NULL CHECK (fulfill_source IN ('in_house', 'rsl')),
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  deducted_at TIMESTAMPTZ,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  sku_id TEXT REFERENCES skus(sku_id),
  UNIQUE (order_id, channel_sku)
);

CREATE TABLE IF NOT EXISTS costs (
  cost_id TEXT PRIMARY KEY,
  purchase_price NUMERIC(14, 4),
  currency TEXT NOT NULL,
  exchange_rate NUMERIC(14, 6),
  intl_freight NUMERIC(14, 4),
  duty_fee NUMERIC(14, 4),
  marketplace_fee NUMERIC(14, 4),
  domestic_shipping NUMERIC(14, 4),
  rsl_charge NUMERIC(14, 4),
  order_qty INTEGER CHECK (order_qty IS NULL OR order_qty > 0),
  unit_cost NUMERIC(14, 4),
  calculated_at TIMESTAMPTZ,
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  order_id TEXT REFERENCES orders(order_id)
);

CREATE TABLE IF NOT EXISTS reorders (
  reorder_id TEXT PRIMARY KEY,
  order_qty INTEGER NOT NULL CHECK (order_qty > 0),
  decision TEXT,
  decided_at TIMESTAMPTZ,
  reorder_status TEXT NOT NULL,
  ordered_at TIMESTAMPTZ,
  expected_date DATE,
  supplier_tracking_no TEXT,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_id TEXT REFERENCES orders(order_id),
  sku_id TEXT NOT NULL REFERENCES skus(sku_id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS labels (
  label_id TEXT PRIMARY KEY,
  label_template TEXT NOT NULL,
  rsl_no TEXT,
  parcel_seq INTEGER NOT NULL CHECK (parcel_seq > 0),
  parcel_total INTEGER NOT NULL CHECK (parcel_total > 0),
  label_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  printed_at TIMESTAMPTZ,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  UNIQUE (order_id, parcel_seq)
);

