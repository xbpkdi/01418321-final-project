import type { Metadata } from "next";
import { Archivo, Bricolage_Grotesque, Kanit, Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n/context";
import "./globals.css";

// UI: Archivo สำหรับละติน ส่วนอักษรไทยตกไปที่ Noto Sans Thai
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

// Display: Bricolage Grotesque ไม่มีอักษรไทย จึงจับคู่กับ Kanit 700 ที่หนักใกล้เคียงกัน
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const kanit = Kanit({ variable: "--font-kanit", subsets: ["thai"], weight: "700" });

export const metadata: Metadata = {
  title: "RSL Fulfillment Hub",
  description:
    "ระบบจัดการคำสั่งซื้อและการจัดส่งสินค้าผ่านมาร์เก็ตเพลสญี่ปุ่น เชื่อมต่อกับ RSL",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${archivo.variable} ${notoSansThai.variable} ${bricolage.variable} ${kanit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
