"use client";

// LoginScreen — UC 1A เข้าสู่ระบบ
// ข้อความทุกคำมาจาก 00-use-case-descriptions.md ห้ามแก้เอง

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOCK_USERS } from "@/mock/users";

// รูปแบบอีเมลตามที่ UC 1A ขั้นตอนที่ 3 กำหนดไว้ตรงตัว
const EMAIL_PATTERN = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z0-9]+$/;

/** ลำดับงานจริงที่ระบบนี้ดูแล ใช้เป็นเนื้อหาของแผงซ้ายแทน copy โฆษณา */
const PIPELINE = [
  { step: "01", label: "ดึงออเดอร์เข้าระบบ", detail: "Rakuten · Yahoo! · Amazon" },
  { step: "02", label: "ตรวจสอบและจับคู่กฎ SKU", detail: "ยืนยันก่อนส่งต่อ" },
  { step: "03", label: "จับคู่คลัง RSL และพิมพ์ใบปะสินค้า", detail: "ลดงานพิมพ์มือ" },
  { step: "04", label: "ตัดสต๊อกและแจ้งเลขติดตาม", detail: "ปิดงานอัตโนมัติ" },
];

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // 1. ตรวจสอบค่าที่กรอกมา
    if (!email.trim() || !password.trim()) {
      setError("ข้อมูลที่กรอกมาไม่ครบ");
      return;
    }

    // 2. ตรวจสอบรูปแบบอีเมล
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("รูปแบบของอีเมลที่กรอกมาไม่ถูกต้อง");
      return;
    }

    // 3. ตรวจสอบอีเมลและรหัสผ่าน (Q1.1) — ของจริงจะย้ายไปทำฝั่ง server
    setSubmitting(true);
    window.setTimeout(() => {
      const user = MOCK_USERS.find((u) => u.user_email === email.trim());

      if (user && user.fail_attempts >= 5) {
        setError(
          "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่ก่อนลองใหม่อีกครั้ง",
        );
        setSubmitting(false);
        return;
      }

      // ไม่ระบุว่าผิดที่ฟิลด์ใด เพื่อความปลอดภัย
      if (!user || user.user_password !== password) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setSubmitting(false);
        return;
      }

      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push("/dashboard");
    }, 600);
  }

  return (
    <div className="grid min-h-[100dvh] grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:grid-rows-none">
      {/* แผงซ้ายไล่เฉดเล็กน้อยให้เป็นวัสดุ ไม่ใช่บล็อกสีทึบแปะไว้ */}
      <section className="from-primary relative flex flex-col gap-14 overflow-hidden bg-linear-to-b to-[oklch(0.31_0.13_265)] px-6 py-5 text-white lg:px-10 lg:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:28px_28px]"
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <Boxes className="size-5" />
          </div>
          <span className="text-lg font-semibold">RSL Fulfillment Hub</span>
        </div>

        {/* ลำดับงานจริง ไม่ใช่ประโยคขายของ คนที่เห็นหน้านี้คือคนเดียวที่ใช้ระบบ */}
        <ol className="relative hidden lg:block">
          {PIPELINE.map((item) => (
            <li
              key={item.step}
              className="flex gap-4 border-t border-white/15 py-4 last:border-b"
            >
              <span
                data-numeric
                className="pt-0.5 text-xs font-medium text-white/45"
              >
                {item.step}
              </span>
              <div>
                <p className="text-sm leading-snug font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-white/55">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="relative mt-auto hidden text-xs text-white/45 lg:block">
          Colorado Co., Ltd. · ระบบภายในสำหรับผู้ดูแลเท่านั้น
        </p>
      </section>

      <section className="flex items-center px-6 py-12 lg:px-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
          <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            ใช้บัญชีผู้ดูแลที่ลงทะเบียนไว้กับระบบ
          </p>

          <div className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="user_email">อีเมล</Label>
              <Input
                id="user_email"
                name="user_email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                aria-invalid={error !== null}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user_password">รหัสผ่าน</Label>
              <Input
                id="user_password"
                name="user_password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                aria-invalid={error !== null}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-1 w-full"
              disabled={submitting}
            >
              {submitting && <Loader2 className="animate-spin" />}
              เข้าสู่ระบบ
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
