"use client";

// LoginScreen — UC 1A เข้าสู่ระบบ
// โครงหน้าแนว poster: ชื่อระบบตัวใหญ่ซ้าย (split-flap) + การ์ดฟอร์มกระจกขวา
// ด้านหลังเป็นกล่องพัสดุ 3D (three.js) และแสงตามเมาส์ ด้านล่างเป็นเทปกาวชื่อช่องทางขาย
// ข้อความและเงื่อนไขตรวจสอบทุกอย่างมาจาก 00-use-case-descriptions.md

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LanguageToggle } from "@/components/app-shell/language-toggle";
import { FlapTitle } from "@/components/landing/flap-title";
import { TapeTicker } from "@/components/landing/tape-ticker";
import { TiltCard } from "@/components/landing/tilt-card";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { MOCK_CONNECTIONS } from "@/mock/orders";
import { useT } from "@/lib/i18n/context";
import { MOCK_USERS } from "@/mock/users";

// รูปแบบอีเมลตามที่ UC 1A ขั้นตอนที่ 3 กำหนดไว้ตรงตัว
const EMAIL_PATTERN = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z0-9]+$/;

// WebGL มีแค่ฝั่ง client และหนัก จึงโหลดแยกหลังหน้าแสดงแล้ว
const ParcelScene = dynamic(
  () => import("@/components/landing/parcel-scene").then((m) => m.ParcelScene),
  { ssr: false },
);

export default function LoginScreen() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const still = usePrefersReducedMotion();

  // ส่งตำแหน่งเมาส์ให้ .cursor-glow
  function trackGlow(e: React.PointerEvent<HTMLDivElement>) {
    const el = hostRef.current;
    if (!el || still) return;
    el.style.setProperty("--gx", `${e.clientX}px`);
    el.style.setProperty("--gy", `${e.clientY}px`);
  }

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
    <div
      ref={hostRef}
      onPointerMove={trackGlow}
      className="cursor-glow relative isolate flex min-h-[100dvh] flex-col overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        <ParcelScene eventSource={hostRef} still={still} />
      </div>

      <header className="flex items-center justify-between gap-4 border-b bg-white/40 px-[clamp(16px,4vw,48px)] py-4 backdrop-blur-md">
        <span className="display flex items-center gap-2 text-xl">
          <span className="bg-cobalt size-2.5 rounded-full" />
          {t.app.name}
        </span>
        <LanguageToggle />
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-10 px-[clamp(16px,4vw,48px)] py-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <section className="rise">
          <p className="eyebrow">{t.app.company}</p>
          <FlapTitle
            text={t.app.name}
            className="display mt-4 cursor-default text-[clamp(3.25rem,9vw,8rem)]"
            suffix={
              <span
                aria-hidden
                className="bg-amber ml-[0.08em] inline-block size-[0.14em] rounded-[0.02em]"
              />
            }
          />
        </section>

        <div className="rise" style={{ animationDelay: "140ms" }}>
          <TiltCard className="p-6 sm:p-8">
            <h2 className="display text-4xl">{t.login.title}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {t.login.description}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="user_email">{t.login.email}</FieldLabel>
                  <Input
                    id="user_email"
                    name="user_email"
                    type="email"
                    autoComplete="email"
                    className="h-11"
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
                    className="h-11"
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
                  <Button type="submit" size="lg" className="h-11" disabled={submitting}>
                    {submitting && <Spinner />}
                    {t.login.submit}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </TiltCard>
        </div>
      </main>

      <div className="pointer-events-none relative -mb-2 grid gap-0 py-6">
        <TapeTicker
          items={MOCK_CONNECTIONS.map((c) => ({ label: c.channel, ok: c.connected }))}
        />
        <TapeTicker
          alt
          items={[
            { label: t.app.name, ok: true },
            { label: t.app.company, ok: true },
          ]}
        />
      </div>

      <footer className="bg-white/50 px-[clamp(16px,4vw,48px)] py-4 backdrop-blur-md">
        <FieldDescription>{t.login.footer}</FieldDescription>
      </footer>
    </div>
  );
}
