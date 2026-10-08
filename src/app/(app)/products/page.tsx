"use client";

// ProductScreen — UC 3A ตั้งกฎ SKU
// ข้อความและเงื่อนไขตรวจสอบทั้งหมดมาจาก 00-use-case-descriptions.md (ดู saveProduct ใน lib/workflow.ts)

import { useMemo, useRef, useState } from "react";
import { FileUp, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionMessage } from "@/components/shared/section-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { productColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { useStore, useUnsavedChanges } from "@/lib/store";
import {
  costToForm,
  deleteProduct,
  findSupplier,
  importProductsCsv,
  saveProduct,
  setProductActive,
  type CostForm,
  type CsvRowResult,
  type ProductResult,
} from "@/lib/workflow";
import { COST_KEYS, type Product } from "@/types/product";

const NO_SUPPLIER = "none";

const BLANK: Product = {
  sku: "",
  product_name: "",
  variation: "",
  sales_channel: "Rakuten Ichiba",
  channel_sku: "",
  supplier_id: "",
  reorder_threshold: 0,
  reorder_qty: 0,
  selling_price: null,
  active: true,
};

export default function ProductScreen() {
  const t = useT();
  const { state, run } = useStore();
  const [draft, setDraft] = useState<Product | null>(null);
  const [costDraft, setCostDraft] = useState<CostForm | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<CsvRowResult[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useUnsavedChanges("product", draft !== null);

  const MESSAGE: Record<Exclude<ProductResult, "ok">, string> = {
    incomplete: t.products.errIncomplete,
    duplicate: t.products.errDuplicateSku,
    "invalid-number": t.products.errInvalidNumber,
  };

  // Order ที่ค้างเพราะยังไม่มีกฎ SKU / ยังไม่ลงทะเบียน (2S, 4A ทางเลือก #2) หรือไม่มีราคาขาย (5A)
  const waiting = state.orders.filter(
    (o) =>
      o.order_status === "รอดำเนินการด้วยตนเอง" &&
      (o.manual_reason === "sku-rule" || o.manual_reason === "sku-unregistered" || o.manual_reason === "price"),
  );

  // ขั้นตอนที่ 2: แสดงฟอร์มข้อมูลสินค้า
  function openCreate() {
    setDraft({ ...BLANK });
    setCostDraft(costToForm(undefined, "new"));
    setEditingSku(null);
    setError(null);
  }

  function openEdit(product: Product) {
    setDraft({ ...product });
    setCostDraft(costToForm(state.costs.find((c) => c.sku === product.sku), product.sku));
    setEditingSku(product.sku);
    setError(null);
  }

  // ขั้นตอนที่ 3: กรอกข้อมูลแล้วกด "บันทึก" (Q13.1)
  function save() {
    if (!draft || !costDraft) return;
    const { result, requeued } = run((s) => {
      const r = saveProduct(s, draft, editingSku);
      if (r.result !== "ok") return r;
      // องค์ประกอบต้นทุนที่กรอกในฟอร์มนี้เป็นค่าตั้งต้นของหน้าคำนวณต้นทุน
      const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
      const old = r.state.costs.find((c) => c.sku === (editingSku ?? draft.sku));
      const cost = {
        sku: draft.sku.trim(),
        currency: costDraft.currency || "CNY",
        exchange_rate_updated_at:
          old && old.exchange_rate === num(costDraft.exchange_rate)
            ? old.exchange_rate_updated_at
            : num(costDraft.exchange_rate) === null
              ? null
              : new Date().toISOString(),
        ...Object.fromEntries(COST_KEYS.map((k) => [k, num(costDraft[k])])),
      } as (typeof r.state.costs)[number];
      const others = r.state.costs.filter((c) => c.sku !== (editingSku ?? draft.sku));
      return { ...r, state: { ...r.state, costs: [...others, cost] } };
    });
    if (result !== "ok") {
      setError(MESSAGE[result]);
      return;
    }
    setDraft(null);
    toast.success(t.products.okSaved, {
      description: requeued > 0 ? t.products.requeued(requeued) : undefined,
    });
  }

  function toggleActive(product: Product) {
    run((s) => ({ state: setProductActive(s, product.sku, !product.active) }));
  }

  // ทางเลือก #1: ลบไม่ได้ถ้ายังมีรายการที่เกี่ยวข้อง เสนอให้ปิดการขายแทน
  function remove(product: Product) {
    const { result } = run((s) => {
      const r = deleteProduct(s, product.sku);
      return { state: r.state, result: r.result };
    });
    if (result === "has-related") {
      toast.error(t.products.errHasRelated, {
        action: product.active
          ? { label: t.products.switchToInactive, onClick: () => toggleActive(product) }
          : undefined,
      });
      return;
    }
    toast.success(t.products.okDeleted(product.sku));
  }

  // ทางเลือก #2: นำเข้าข้อมูลสินค้าจำนวนมากจากไฟล์ CSV
  async function importCsv(file: File) {
    const text = await file.text();
    const { rows } = run((s) => {
      const r = importProductsCsv(s, text);
      return { state: r.state, rows: r.rows };
    });
    setCsvRows(rows);
    const ok = rows.filter((r) => r.result === "ok").length;
    if (ok > 0) toast.success(t.products.importOk(ok));
    if (ok < rows.length) toast.error(t.products.importFailed(rows.length - ok));
    if (fileRef.current) fileRef.current.value = "";
  }

  const columns = productColumns(
    t,
    (sku) => findSupplier(state, sku)?.supplier_name ?? "",
    openEdit,
    toggleActive,
    remove,
  );

  // ค้นด้วย SKU ชื่อสินค้า หรือซัพพลายเออร์
  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return state.products;
    return state.products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.product_name.toLowerCase().includes(q) ||
        (findSupplier(state, p.supplier_id)?.supplier_name ?? "").toLowerCase().includes(q),
    );
  }, [state, keyword]);

  const costLabels: Record<(typeof COST_KEYS)[number], string> = {
    purchase_price: t.cost.purchasePrice,
    exchange_rate: t.cost.exchangeRate,
    intl_freight: t.cost.intlFreight,
    duty_fee: t.cost.dutyFee,
    order_qty: t.cost.orderQty,
    marketplace_fee: t.cost.marketplaceFee,
    domestic_shipping: t.cost.domesticShipping,
    rsl_charge: t.cost.rslCharge,
  };

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.products.title}
        description={t.products.description}
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileUp />
              {t.products.importCsv}
            </Button>
            <Button onClick={openCreate}>{t.products.create}</Button>
          </div>
        }
      />

      {waiting.length > 0 && (
        <Card className="border-status-attention/30 bg-status-attention-bg/40">
          <CardHeader>
            <CardTitle className="text-sm">{t.products.waitingRuleTitle}</CardTitle>
            <CardDescription>{t.products.waitingRuleHint}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {waiting.map((o) => (
              <div key={o.order_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{o.order_id}</span>
                <StatusBadge status={o.order_status} />
                <span className="text-muted-foreground">
                  {o.manual_reason === "sku-rule" ? o.channel_sku : o.sku}
                </span>
                <span className="text-muted-foreground">
                  {o.manual_reason ? t.manualReason[o.manual_reason] : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {csvRows && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t.products.importResultTitle}</CardTitle>
            <CardDescription>{t.products.importCsvHint}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {csvRows.map((r) => (
              <p key={r.row} className={r.result === "ok" ? "" : "text-status-cancelled"}>
                {t.products.importRow(r.row)} · {r.sku || "—"} ·{" "}
                {r.result === "ok" ? t.products.okSaved : MESSAGE[r.result]}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <DataTable
        data={visible}
        columns={columns}
        getRowId={(row) => row.sku}
        toolbar={
          <TableSearch
            value={keyword}
            onChange={setKeyword}
            label={t.products.searchLabel}
            placeholder={t.products.searchPlaceholder}
          />
        }
        emptyState={
          <EmptyState
            icon={Package}
            title={keyword ? t.products.emptySearchTitle : t.products.emptyTitle}
            hint={keyword ? t.products.emptySearchHint : t.products.emptyHint}
            action={keyword ? undefined : <Button onClick={openCreate}>{t.products.create}</Button>}
          />
        }
      />

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSku ? t.products.editTitle : t.products.create}</DialogTitle>
            <DialogDescription>{t.products.dialogHint}</DialogDescription>
          </DialogHeader>

          {draft && costDraft && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="product_name">{t.products.productName}</FieldLabel>
                <Input
                  id="product_name"
                  value={draft.product_name}
                  onChange={(e) => setDraft({ ...draft, product_name: e.target.value })}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sku">SKU</FieldLabel>
                  <Input
                    id="sku"
                    value={draft.sku}
                    onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="variation">Variation</FieldLabel>
                  <Input
                    id="variation"
                    value={draft.variation}
                    onChange={(e) => setDraft({ ...draft, variation: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sales_channel">{t.common.salesChannel}</FieldLabel>
                  <Input id="sales_channel" value={draft.sales_channel} disabled />
                </Field>
                {/* ทางเลือก #3: Mapping ระหว่าง SKU ภายในกับรหัสสินค้าของ Rakuten */}
                <Field>
                  <FieldLabel htmlFor="channel_sku">{t.products.channelSku}</FieldLabel>
                  <Input
                    id="channel_sku"
                    value={draft.channel_sku}
                    onChange={(e) => setDraft({ ...draft, channel_sku: e.target.value })}
                  />
                  <FieldDescription>{t.products.channelSkuHint}</FieldDescription>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="supplier_id">{t.common.supplier}</FieldLabel>
                  <Select
                    value={draft.supplier_id || NO_SUPPLIER}
                    onValueChange={(v) => setDraft({ ...draft, supplier_id: v === NO_SUPPLIER ? "" : v })}
                  >
                    <SelectTrigger id="supplier_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SUPPLIER}>{t.products.supplierNone}</SelectItem>
                      {state.suppliers.map((s) => (
                        <SelectItem key={s.supplier_id} value={s.supplier_id}>
                          {s.supplier_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="selling_price">{t.common.sellingPrice}</FieldLabel>
                  <Input
                    id="selling_price"
                    type="number"
                    min={0}
                    value={draft.selling_price ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        selling_price: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="reorder_threshold">{t.products.reorderThresholdField}</FieldLabel>
                  <Input
                    id="reorder_threshold"
                    type="number"
                    min={1}
                    value={draft.reorder_threshold}
                    onChange={(e) => setDraft({ ...draft, reorder_threshold: Number(e.target.value) })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reorder_qty">{t.products.reorderQty}</FieldLabel>
                  <Input
                    id="reorder_qty"
                    type="number"
                    min={1}
                    value={draft.reorder_qty}
                    onChange={(e) => setDraft({ ...draft, reorder_qty: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <FieldSet className="border-t pt-4">
                <FieldLegend variant="label">{t.products.costSection}</FieldLegend>
                <FieldDescription>{t.products.costSectionHint}</FieldDescription>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="cost_currency">{t.cost.currency}</FieldLabel>
                    <Input
                      id="cost_currency"
                      value={costDraft.currency}
                      onChange={(e) => setCostDraft({ ...costDraft, currency: e.target.value.toUpperCase() })}
                    />
                  </Field>
                  {COST_KEYS.map((key) => (
                    <Field key={key}>
                      <FieldLabel htmlFor={`cost_${key}`}>{costLabels[key]}</FieldLabel>
                      <Input
                        id={`cost_${key}`}
                        type="number"
                        min={0}
                        step="any"
                        value={costDraft[key]}
                        onChange={(e) => setCostDraft({ ...costDraft, [key]: e.target.value })}
                      />
                    </Field>
                  ))}
                </div>
              </FieldSet>

              {error && <SectionMessage appearance="error">{error}</SectionMessage>}
            </FieldGroup>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={save}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
