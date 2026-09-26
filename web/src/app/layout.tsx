import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CreditMiner - Credit Card Customer Behavior Mining",
  description:
    "Interactive dashboard for credit card churn prediction, customer segmentation, and risk analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable)}>
      <body className="app-body min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="app-shell flex min-h-screen">
            <Sidebar />
            <main className="app-main min-w-0 flex-1 md:pl-64">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
