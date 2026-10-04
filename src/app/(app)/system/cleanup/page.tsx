"use client";

// DataCleanupScreen — UC 10A ลบข้อมูลเก่าที่ไม่ใช้แล้ว
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { MOCK_ORDERS } from "@/mock/orders";

const DATA_TYPES = [
  { key: "order", label: "Order" },
  { key: "cost", label: "Cost" },
  { key: "label", label: "Label" },
  { key: "reorder", label: "Reorder" },
];

/** Order ที่ปิดแล้วตาม Pre-Condition ของ UC */
const CLOSED_ORDERS = MOCK_ORDERS.filter((o) =>
  ["จัดส่งสำเร็จ", "ยกเลิกแล้ว"].includes(o.order_status),
);

export default function DataCleanupScreen() {
  const [types, setTypes] = useState<string[]>([]);
  const [cutoff, setCutoff] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"range" | "closed" | null>(null);

  function toggleType(key: string) {
    setTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
    setError(null);
  }

  // ทางเลือก #1: ลบตามช่วงวันที่
  function reviewRange() {
    setError(null);

    // ต้องเลือกประเภทข้อมูลอย่างน้อย 1 ประเภท
    if (types.length === 0) {
      setError("กรุณาเลือกประเภทข้อมูลที่ต้องการลบ");
      return;
    }

    if (!cutoff) {
      setError("สามารถลบข้อมูลที่เก่ากว่า 12 เดือนเท่านั้น");
      return;
    }

    // cutoff_date ต้องย้อนหลังอย่างน้อย 12 เดือน
    const limit = new Date();
    limit.setMonth(limit.getMonth() - 12);
    if (new Date(cutoff) > limit) {
      setError("สามารถลบข้อมูลที่เก่ากว่า 12 เดือนเท่านั้น");
      return;
    }

    // ไม่พบข้อมูลที่เข้าเงื่อนไข
    const matched = MOCK_ORDERS.filter(
      (o) =>
        ["จัดส่งสำเร็จ", "ยกเลิกแล้ว"].includes(o.order_status) &&
        new Date(o.order_date) < new Date(cutoff),
    );
    if (matched.length === 0) {
      setError("ไม่พบข้อมูลที่ลบได้ในช่วงเวลาที่เลือก");
      return;
    }

    setConfirming("range");
  }

  // ทางเลือก #2: ลบ Order ที่ปิดแล้วทั้งหมด
  function reviewClosed() {
    setError(null);
    if (CLOSED_ORDERS.length === 0) {
      setError("ไม่พบ Order ที่ปิดแล้วให้ลบ");
      return;
    }
    setConfirming("closed");
  }

  function commit() {
    if (confirming === "closed") {
      toast.success(
        `ลบ Order ที่ปิดแล้วสำเร็จ ${CLOSED_ORDERS.length} รายการ`,
      );
    } else {
      toast.success(`ลบข้อมูลสำเร็จ ${types.length} ประเภท`, {
        description: "ระบบบันทึก Log การลบไว้แล้ว",
      });
    }
    setConfirming(null);
  }

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="ลบข้อมูลเก่า"
        description="ลบข้อมูลที่สิ้นสุดแล้วออกจากระบบเพื่อลดปริมาณข้อมูลสะสม ระบบบันทึก Log การลบทุกครั้ง"
      />

      {error && (
        <p
          role="alert"
          className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      <Tabs defaultValue="range" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="range">ลบตามช่วงวันที่</TabsTrigger>
          <TabsTrigger value="closed">ลบ Order ที่ปิดแล้ว</TabsTrigger>
        </TabsList>

        <TabsContent value="range" className="mt-4">
          <section className="grid gap-5 rounded-lg border p-5">
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">ประเภทข้อมูล</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {DATA_TYPES.map((t) => (
                  <label
                    key={t.key}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={types.includes(t.key)}
                      onChange={() => toggleType(t.key)}
                      className="size-4"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="cutoff_date">ลบข้อมูลที่เก่ากว่าวันที่</Label>
              <Input
                id="cutoff_date"
                type="date"
                value={cutoff}
                onChange={(e) => {
                  setCutoff(e.target.value);
                  setError(null);
                }}
              />
              <p className="text-muted-foreground text-xs">
                ลบได้เฉพาะข้อมูลที่เก่ากว่า 12 เดือนขึ้นไป
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={reviewRange}>
                <Trash2 />
                ยืนยันการลบข้อมูล
              </Button>
              <Button variant="outline">
                <Download />
                ดาวน์โหลดไฟล์สำรองก่อนลบ
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <section className="grid gap-5 rounded-lg border p-5">
            <div>
              <p className="text-sm">
                ลบ Order ที่จัดส่งสำเร็จหรือยกเลิกแล้วทั้งหมด
                โดยไม่ต้องกำหนดช่วงวันที่
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                พบ Order ที่ปิดแล้ว{" "}
                <span data-numeric className="text-foreground font-medium">
                  {CLOSED_ORDERS.length}
                </span>{" "}
                รายการ พร้อมใบปะสินค้าที่เกี่ยวข้อง
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={reviewClosed}>
                <Trash2 />
                ยืนยันการลบข้อมูล
              </Button>
              <Button variant="outline">
                <Download />
                ดาวน์โหลดไฟล์สำรองก่อนลบ
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
            <DialogDescription>
              {confirming === "closed"
                ? `ระบบจะลบ Order ที่ปิดแล้ว ${CLOSED_ORDERS.length} รายการ พร้อมใบปะสินค้าที่เกี่ยวข้อง`
                : `ระบบจะลบข้อมูลประเภท ${types.join(", ")} ที่เก่ากว่า ${cutoff}`}
              {" · "}
              การลบนี้ย้อนกลับไม่ได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              ยกเลิก
            </Button>
            <Button onClick={commit}>ยืนยันการลบข้อมูล</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
