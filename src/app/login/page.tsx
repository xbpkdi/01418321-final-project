"use client";

// LoginScreen — UC 1A เข้าสู่ระบบ
// โครงหน้าแนว poster: ชื่อระบบตัวใหญ่ซ้าย (split-flap) + การ์ดฟอร์มกระจกขวา
// ด้านหลังเป็นตาราง blueprint จางๆ + แถบแสง ribbon โทนน้ำเงิน + แสงส้มจางๆ ตามเมาส์
// ข้อความและเงื่อนไขตรวจสอบทุกอย่างมาจาก 00-use-case-descriptions.md

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LanguageToggle } from "@/components/app-shell/language-toggle";
import { FlapTitle } from "@/components/landing/flap-title";
import { GlowCard } from "@/components/landing/glow-card";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import { useT } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { login } from "@/lib/workflow";

export default function LoginScreen() {
  const router = useRouter();
  const t = useT();
  const { run } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const still = usePrefersReducedMotion();

  const glowFrame = useRef<number | null>(null);

  // ส่งตำแหน่งเมาส์ให้ .cursor-glow ไม่เกินเฟรมละครั้ง เพื่อไม่ให้วาดพื้นหลังใหม่ทุก event
  function trackGlow(e: React.PointerEvent<HTMLDivElement>) {
    if (still || glowFrame.current !== null) return;
    const { clientX, clientY } = e;
    glowFrame.current = requestAnimationFrame(() => {
      glowFrame.current = null;
      const el = hostRef.current;
      if (!el) return;
      el.style.setProperty("--gx", `${clientX}px`);
      el.style.setProperty("--gy", `${clientY}px`);
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    // ขั้นตอนที่ 3 ทั้งหมด (ตรวจค่าว่าง → รูปแบบอีเมล → Q1.1) อยู่ใน workflow.login
    // ของจริงจะย้ายไปทำฝั่ง server และเทียบ hash แทนการเทียบตรงๆ
    window.setTimeout(() => {
      const { result } = run((s) => {
        const r = login(s, email, password);
        return { state: r.state, result: r.result };
      });
      setSubmitting(false);
      if (result === "ok") {
        toast.success(t.login.okLogin);
        router.push("/dashboard");
        return;
      }
      setError(
        {
          incomplete: t.login.errIncomplete,
          "email-format": t.login.errEmailFormat,
          locked: t.login.errTooManyAttempts,
          wrong: t.login.errWrongCredentials,
        }[result],
      );
    }, 600);
  }

  return (
    <div
      ref={hostRef}
      onPointerMove={trackGlow}
      className="bg-background relative isolate flex min-h-[100dvh] flex-col overflow-hidden"
    >
      <div className="grid-paper" aria-hidden />
      <div className="ribbon" aria-hidden />
      <div className="ribbon ribbon-2" aria-hidden />
      <div className="cursor-glow" aria-hidden />

      <header className="flex items-center justify-between gap-4 border-b px-[clamp(16px,4vw,48px)] py-4">
        <span className="display flex items-center gap-2 text-xl">
          <span className="bg-cobalt size-2.5 rounded-full" />
          {t.app.name}
        </span>
        <LanguageToggle />
      </header>

      <main className="mx-auto grid w-full max-w-[1320px] flex-1 items-center gap-10 px-[clamp(16px,4vw,48px)] py-10 lg:grid-cols-[auto_440px] lg:justify-center lg:gap-14">
        {/* จอเล็ก: ขนาดหัวข้อคิดจากความกว้างคอลัมน์ (@container)
            จอ lg ขึ้นไป: คิดจากพื้นที่ที่เหลือหลังหักการ์ด 440px, ช่องว่าง 3.5rem และขอบซ้ายขวา
            คอลัมน์ซ้ายจึงกว้างเท่าตัวหนังสือพอดี การ์ดชิดหัวข้อในระยะคงที่
            FULFILLMENT กว้างราว 4.69em จึงคูณ 0.212 */}
        <section className="rise @container lg:[container-type:normal]">
          <p className="eyebrow">{t.app.company}</p>
          <FlapTitle
            text={t.app.name}
            className="display display-heavy mt-4 cursor-default text-[min(12rem,21cqw)] lg:text-[min(12rem,calc((min(100vw,1320px)-2*clamp(16px,4vw,48px)-440px-3.5rem)*0.212))]"
            suffix={
              <span
                aria-hidden
                className="bg-coral ml-[0.08em] inline-block size-[0.14em] rounded-[0.02em]"
              />
            }
          />
          <p className="text-muted-foreground mt-6 text-base leading-relaxed text-balance">
            {t.login.tagline}
          </p>
        </section>

        <div className="rise" style={{ animationDelay: "140ms" }}>
          <GlowCard className="px-6 py-7 sm:py-8">
            {/* ขีดสั้นแบบที่คั่นหนังสือ สีคอรัลเข้าชุดกับจุดหลังหัวข้อใหญ่ */}
            <span aria-hidden className="bg-coral mb-4 block h-1 w-16 rounded-full" />
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
          </GlowCard>
        </div>
      </main>

      <footer className="px-[clamp(16px,4vw,48px)] py-5">
        <FieldDescription>{t.login.footer}</FieldDescription>
      </footer>
    </div>
  );
}
