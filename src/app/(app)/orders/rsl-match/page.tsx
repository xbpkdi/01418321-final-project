"use client";

// RslMatchScreen — UC 1S จับคู่ Order กับเลข RSL
// ข้อความและเงื่อนไขทั้งหมดมาจาก 00-use-case-descriptions.md (ดู matchRsl ใน lib/workflow.ts)

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionMessage } from "@/components/shared/section-message";
import { DataTable } from "@/components/shared/data-table";
import { TableSearch } from "@/components/shared/table-search";
import { matchedColumns, queueColumns } from "./columns";
import { useT } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { findOrder, matchAllRsl, matchRsl, rslMatched, rslQueue, unmatchRsl } from "@/lib/workflow";
import type { RslShipment } from "@/mock/rsl";

export default function RslMatchScreen() {
  const router = useRouter();
  const t = useT();
  const { state, run } = useStore();
  const [candidates, setCandidates] = useState<{ orderId: string; options: RslShipment[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const queue = rslQueue(state);
  const matched = rslMatched(state);

  function match(orderId: string, chosen?: string) {
    setError(null);
    setWorking(orderId);
    window.setTimeout(() => {
      const { result } = run((s) => {
        const r = matchRsl(s, orderId, chosen);
        return { state: r.state, result: r.result };
      });
      setWorking(null);
      switch (result.kind) {
        case "not-found": // ทางเลือก #1
          setCandidates(null);
          setError(t.rslMatch.errNotFound);
          break;
        case "multiple": // ทางเลือก #2
          setError(t.rslMatch.errMultiple);
          setCandidates({ orderId, options: result.options });
          break;
        case "connection": // ทางเลือก #4
          setError(t.rslMatch.errConnection);
          break;
        case "ok":
          setCandidates(null);
          // Q4.2 แล้วส่งต่อ 6S
          toast.success(t.rslMatch.okMatched, {
            description: `${t.rslMatch.rslReference} ${result.reference}`,
            action: { label: t.nav.items.label, onClick: () => router.push("/shipping/label") },
          });
          break;
      }
    }, 450);
  }

  function matchAll() {
    setError(null);
    setCandidates(null);
    const { summary } = run((s) => {
      const r = matchAllRsl(s);
      return { state: r.state, summary: r.summary };
    });
    if (summary.connection) {
      setError(t.rslMatch.errConnection);
      return;
    }
    toast.info(t.rslMatch.matchAllSummary(summary.matched, summary.multiple, summary.notFound));
  }

  // ทางเลือก #3: ยกเลิกการจับคู่ที่ทำไปแล้ว
  function unmatch(orderId: string) {
    run((s) => unmatchRsl(s, orderId));
    toast.success(t.rslMatch.okUnmatched(orderId));
  }

  const queueCols = queueColumns(t, (o) => match(o.order_id), working);
  const matchedCols = matchedColumns(t, unmatch);

  // ค้นด้วย Order ID หรือ SKU เฉพาะคิวรอจับคู่
  const visibleQueue = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(
      (o) => o.order_id.toLowerCase().includes(q) || o.sku.toLowerCase().includes(q),
    );
  }, [queue, keyword]);

  const candidateOrder = candidates ? findOrder(state, candidates.orderId) : undefined;

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.rslMatch.title}
        description={t.rslMatch.description}
        action={
          <Button
            onClick={matchAll}
            disabled={!queue.some((o) => o.order_status === "ยังไม่ได้จับคู่")}
          >
            {t.rslMatch.matchAll}
          </Button>
        }
      />

      {error && <SectionMessage appearance="error">{error}</SectionMessage>}

      {candidates && candidateOrder && (
        <Card className="border-status-attention/30 bg-status-attention-bg/40">
          <CardHeader>
            <CardTitle className="text-sm">
              {t.rslMatch.chooseFor(candidateOrder.order_id, candidateOrder.sku)}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {candidates.options.map((option) => (
              <Item key={option.rsl_order_id} variant="outline">
                <ItemContent>
                  <ItemTitle>{option.rsl_order_id}</ItemTitle>
                  <ItemDescription>
                    {t.rslMatch.stockLeft} <span data-numeric>{option.rsl_stock_qty}</span>{" "}
                    {t.common.unitPieces}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => match(candidateOrder.order_id, option.rsl_order_id)}
                  >
                    {t.rslMatch.chooseThis}
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.rslMatch.queueTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={visibleQueue}
            columns={queueCols}
            getRowId={(row) => row.order_id}
            showColumnToggle={false}
            toolbar={
              <TableSearch
                value={keyword}
                onChange={setKeyword}
                label={t.rslMatch.searchLabel}
                placeholder={t.rslMatch.searchPlaceholder}
              />
            }
            emptyState={
              <EmptyState
                icon={Link2}
                title={keyword ? t.rslMatch.emptySearchTitle : t.rslMatch.emptyTitle}
                hint={keyword ? t.rslMatch.emptySearchHint : t.rslMatch.emptyHint}
              />
            }
          />
        </CardContent>
      </Card>

      {matched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.rslMatch.matchedTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={matched}
              columns={matchedCols}
              getRowId={(row) => row.order_id}
              showColumnToggle={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
