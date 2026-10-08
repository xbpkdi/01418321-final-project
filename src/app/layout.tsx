import type { Metadata } from "next";
import { Anton, Archivo, Kanit, Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n/context";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

// UI: Archivo สำหรับละติน ส่วนอักษรไทยตกไปที่ Noto Sans Thai
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

// Display: Anton ไม่มีอักษรไทย จึงจับคู่กับ Kanit 700 ที่หนักและแคบใกล้เคียงกัน
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});
const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai"],
  weight: "700",
});

export const metadata: Metadata = {
  title: "RSL Fulfillment Hub",
  description:
    "ระบบจัดการคำสั่งซื้อและการจัดส่งสินค้าผ่าน Rakuten Ichiba เชื่อมต่อกับ RSL",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${archivo.variable} ${notoSansThai.variable} ${anton.variable} ${kanit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <StoreProvider>{children}</StoreProvider>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
