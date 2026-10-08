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
  type LucideIcon,
} from "lucide-react";
import type { Dict } from "@/lib/i18n/dict";

type GroupKey = keyof Dict["nav"]["groups"];
type ItemKey = keyof Dict["nav"]["items"];

export type NavItem = {
  /** key ของข้อความ ไม่เก็บข้อความตรงๆ เพื่อให้สลับภาษาได้ */
  titleKey: ItemKey;
  href: string;
  uc: string;
  /** ปุ่มของ UC อื่นที่ไม่มี Screen object ของตัวเอง แต่วางไว้ในหน้านี้ (4A, 5S) */
  hostsUc?: string;
  screen: string;
  icon: LucideIcon;
};

export type NavGroup = {
  labelKey: GroupKey;
  items: NavItem[];
};

/** โครงเมนูตาม ui-design-brief.md ข้อ 9.2 — ใช้ร่วมกันระหว่าง Sidebar กับหน้า Site map (rubric ข้อ 29) */
export const navGroups: NavGroup[] = [
  {
    labelKey: "main",
    items: [
      {
        titleKey: "dashboard",
        href: "/dashboard",
        uc: "—",
        hostsUc: "4A",
        screen: "DashboardScreen",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    labelKey: "orders",
    items: [
      {
        titleKey: "verify",
        href: "/orders/verify",
        uc: "2A",
        screen: "OrderVerifyScreen",
        icon: ClipboardCheck,
      },
      {
        titleKey: "rslMatch",
        href: "/orders/rsl-match",
        uc: "1S",
        screen: "RslMatchScreen",
        icon: Link2,
      },
      {
        titleKey: "cancel",
        href: "/orders/cancel",
        uc: "7A",
        screen: "CancelOrderScreen",
        icon: XCircle,
      },
    ],
  },
  {
    labelKey: "products",
    items: [
      {
        titleKey: "products",
        href: "/products",
        uc: "3A",
        screen: "ProductScreen",
        icon: Package,
      },
      {
        titleKey: "stock",
        href: "/products/stock",
        uc: "3S",
        screen: "StockCheckScreen",
        icon: Boxes,
      },
      {
        titleKey: "cost",
        href: "/products/cost",
        uc: "4S",
        screen: "CostCalculatorScreen",
        icon: Calculator,
      },
      {
        titleKey: "reorder",
        href: "/products/reorder",
        uc: "5A+6A",
        screen: "ReorderDecisionScreen",
        icon: ShoppingCart,
      },
    ],
  },
  {
    labelKey: "shipping",
    items: [
      {
        titleKey: "shipping",
        href: "/shipping",
        uc: "8A",
        hostsUc: "5S",
        screen: "ShipmentScreen",
        icon: Truck,
      },
      {
        titleKey: "label",
        href: "/shipping/label",
        uc: "9A",
        screen: "LabelPrintScreen",
        icon: Printer,
      },
    ],
  },
  {
    labelKey: "system",
    items: [
      {
        titleKey: "cleanup",
        href: "/system/cleanup",
        uc: "10A",
        screen: "DataCleanupScreen",
        icon: Trash2,
      },
    ],
  },
];

// หน้า /sitemap ไม่อยู่ในเมนู เพราะเป็นเอกสารประกอบรายงาน (rubric ข้อ 29) ไม่ใช่งานที่ Admin ทำประจำ
// เข้าถึงได้ทาง URL ตรงๆ เพื่อ capture ภาพไปใส่รายงาน
