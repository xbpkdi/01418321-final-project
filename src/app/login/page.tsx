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
    <div className="grid min-h-[100dvh] grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:grid-rows-none">
      {/* บนมือถือย่อเหลือแถบแบรนด์ เพื่อให้ฟอร์มอยู่ในจอแรกโดยไม่ต้องเลื่อน */}
      <section className="bg-primary text-primary-foreground flex flex-col justify-between gap-10 px-6 py-5 lg:px-14 lg:py-14">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <Boxes className="size-5" />
          </div>
          <span className="text-lg font-semibold">RSL Fulfillment Hub</span>
        </div>

        <div className="hidden max-w-lg lg:block">
          {/* ขึ้นบรรทัดเอง เพราะเบราว์เซอร์ตัดบรรทัดภาษาไทยกลางคำได้ */}
          <h1 className="text-3xl leading-snug font-semibold">
            จัดการออเดอร์จากทุกช่องทางขาย
            <br />
            ไว้ที่เดียว
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            ตรวจสอบคำสั่งซื้อ จับคู่คลัง RSL พิมพ์ใบปะสินค้า ตรวจสต๊อก
            และคำนวณต้นทุนต่อหน่วย โดยไม่ต้องสลับไปมาหลายระบบ
          </p>
        </div>

        <p className="hidden text-xs text-white/50 lg:block">
          Colorado Co., Ltd. · Rakuten Ichiba · Yahoo! Auctions · Amazon
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-14">
        <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
          <h2 className="text-xl font-semibold">เข้าสู่ระบบ</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            สำหรับผู้ดูแลระบบเท่านั้น
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
                className="text-destructive bg-destructive/8 rounded-md px-3 py-2.5 text-sm"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="mt-1 w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              เข้าสู่ระบบ
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
