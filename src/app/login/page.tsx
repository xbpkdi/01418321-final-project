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
import { useT } from "@/lib/i18n/context";
import { MOCK_USERS } from "@/mock/users";

// รูปแบบอีเมลตามที่ UC 1A ขั้นตอนที่ 3 กำหนดไว้ตรงตัว
const EMAIL_PATTERN = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z0-9]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // 1. ตรวจสอบค่าที่กรอกมา
    if (!email.trim() || !password.trim()) {
      setError(t.login.errIncomplete);
      return;
    }

    // 2. ตรวจสอบรูปแบบอีเมล
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t.login.errEmailFormat);
      return;
    }

    // 3. ตรวจสอบอีเมลและรหัสผ่าน (Q1.1) — ของจริงจะย้ายไปทำฝั่ง server
    setSubmitting(true);
    window.setTimeout(() => {
      const user = MOCK_USERS.find((u) => u.user_email === email.trim());

      if (user && user.fail_attempts >= 5) {
        setError(t.login.errTooManyAttempts);
        setSubmitting(false);
        return;
      }

      // ไม่ระบุว่าผิดที่ฟิลด์ใด เพื่อความปลอดภัย
      if (!user || user.user_password !== password) {
        setError(t.login.errWrongCredentials);
        setSubmitting(false);
        return;
      }

      toast.success(t.login.okLogin);
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
          {t.app.name}
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t.login.title}</CardTitle>
            <CardDescription>{t.login.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="user_email">{t.login.email}</FieldLabel>
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
                  <FieldLabel htmlFor="user_password">{t.login.password}</FieldLabel>
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
                    {t.login.submit}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <FieldDescription className="text-center">
          {t.login.footer}
        </FieldDescription>
      </div>
    </div>
  );
}
