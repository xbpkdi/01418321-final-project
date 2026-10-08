"use client";

// เครื่องมือทดสอบ — ไม่ใช่หน้าจอของระบบจริง ไม่อยู่ในเมนูและผังโครงสร้างหน้าจอ
// ใช้จำลองข้อผิดพลาดจากระบบภายนอกตาม "ทางเลือก" ของแต่ละ UC เพื่อทดสอบและ capture รูป (rubric ข้อ 33)
// และรีเซ็ตข้อมูลตัวอย่างกลับไปเป็นค่าตั้งต้น

import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/page-header";
import { useT } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { FAULT_KEYS } from "@/lib/workflow";

export default function DevToolsScreen() {
  const t = useT();
  const { state, run, reset } = useStore();

  return (
    <div className="grid max-w-3xl gap-6 p-6">
      <PageHeader title={t.dev.title} description={t.dev.description} />

      <Card>
        <CardHeader>
          <CardTitle>{t.dev.faultsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {FAULT_KEYS.map((key) => (
            <Field key={key} orientation="horizontal">
              <Checkbox
                id={`fault_${key}`}
                checked={state.faults[key]}
                onCheckedChange={(v) => {
                  run((s) => ({
                    state: { ...s, faults: { ...s.faults, [key]: v === true } },
                  }));
                }}
              />
              <FieldLabel htmlFor={`fault_${key}`} className="font-normal">
                {t.dev.faults[key]}
              </FieldLabel>
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dev.reset}</CardTitle>
          <CardDescription>{t.dev.resetHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => {
              // เก็บ session ไว้ ไม่งั้นรีเซ็ตแล้วโดนเด้งออกไปหน้า Login
              const session = state.session;
              reset();
              run((s) => ({ state: { ...s, session } }));
              toast.success(t.dev.resetDone);
            }}
          >
            <RotateCcw />
            {t.dev.reset}
          </Button>
          <p className="text-muted-foreground text-sm">
            {t.dev.accounts}: {t.dev.accountsHint}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
