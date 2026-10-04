"use client";

// LoginScreen — UC 1A เข้าสู่ระบบ
// โครงหน้าอิง shadcn block login-03 (การ์ดกลางจอบนพื้น muted)
// ข้อความและเงื่อนไขตรวจสอบทุกอย่างมาจาก 00-use-case-descriptions.md

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="bg-muted flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Boxes className="size-4" />
          </div>
          RSL Fulfillment Hub
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">เข้าสู่ระบบ</CardTitle>
            <CardDescription>
              ใช้บัญชีผู้ดูแลที่ลงทะเบียนไว้กับระบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="user_email">อีเมล</FieldLabel>
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
                </Field>

                <Field>
                  <FieldLabel htmlFor="user_password">รหัสผ่าน</FieldLabel>
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
                </Field>

                {error && (
                  <p
                    role="alert"
                    className="text-destructive border-destructive/20 bg-destructive/5 rounded-md border px-3 py-2.5 text-sm"
                  >
                    {error}
                  </p>
                )}

                <Field>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Spinner />}
                    เข้าสู่ระบบ
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <FieldDescription className="text-center">
          Colorado Co., Ltd. · ระบบภายในสำหรับผู้ดูแลเท่านั้น
        </FieldDescription>
      </div>
    </div>
  );
}
