import {
  ClipboardCheck,
  Link2,
  XCircle,
  Package,
  Boxes,
  Calculator,
  ShoppingCart,
  Truck,
  Printer,
  Trash2,
  LayoutDashboard,
  Network,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  uc: string;
  screen: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** โครงเมนูตาม ui-design-brief.md ข้อ 9.2 — ใช้ร่วมกันระหว่าง Sidebar กับหน้า Site map (rubric ข้อ 29) */
export const navGroups: NavGroup[] = [
  {
    label: "หน้าหลัก",
    items: [
      {
        title: "ภาพรวมระบบ",
        href: "/dashboard",
        uc: "—",
        screen: "DashboardScreen",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "คำสั่งซื้อ",
    items: [
      {
        title: "ตรวจสอบคำสั่งซื้อ",
        href: "/orders/verify",
        uc: "2A",
        screen: "OrderVerifyScreen",
        icon: ClipboardCheck,
      },
      {
        title: "จับคู่ Order กับ RSL",
        href: "/orders/rsl-match",
        uc: "1S",
        screen: "RslMatchScreen",
        icon: Link2,
      },
      {
        title: "ยกเลิก Order",
        href: "/orders/cancel",
        uc: "7A",
        screen: "CancelOrderScreen",
        icon: XCircle,
      },
    ],
  },
  {
    label: "สินค้าและสต๊อก",
    items: [
      {
        title: "ตั้งกฎ SKU / ข้อมูลสินค้า",
        href: "/products",
        uc: "3A",
        screen: "ProductScreen",
        icon: Package,
      },
      {
        title: "ตรวจสอบสต๊อก",
        href: "/products/stock",
        uc: "3S",
        screen: "StockCheckScreen",
        icon: Boxes,
      },
      {
        title: "คำนวณต้นทุน",
        href: "/products/cost",
        uc: "4S",
        screen: "CostCalculatorScreen",
        icon: Calculator,
      },
      {
        title: "ตัดสินใจสั่งซื้อเพิ่ม",
        href: "/products/reorder",
        uc: "5A+6A",
        screen: "ReorderDecisionScreen",
        icon: ShoppingCart,
      },
    ],
  },
  {
    label: "จัดส่ง",
    items: [
      {
        title: "จัดส่งสินค้าให้ลูกค้า",
        href: "/shipping",
        uc: "8A",
        screen: "ShipmentScreen",
        icon: Truck,
      },
      {
        title: "พิมพ์ใบปะสินค้า",
        href: "/shipping/label",
        uc: "9A",
        screen: "LabelPrintScreen",
        icon: Printer,
      },
    ],
  },
  {
    label: "ระบบ",
    items: [
      {
        title: "ลบข้อมูลเก่า",
        href: "/system/cleanup",
        uc: "10A",
        screen: "DataCleanupScreen",
        icon: Trash2,
      },
      {
        title: "ผังโครงสร้างหน้าจอ",
        href: "/sitemap",
        uc: "—",
        screen: "SiteMapScreen",
        icon: Network,
      },
    ],
  },
];
