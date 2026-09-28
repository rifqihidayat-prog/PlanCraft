import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlanCraft - Perencanaan & Realisasi Produksi Daging Frozen",
  description: "Aplikasi perencanaan mingguan dan tracking realisasi harian pengolahan daging frozen (1 Line, 1 Shift)",
  applicationName: "PlanCraft",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PlanCraft",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
