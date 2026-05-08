import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "CreditMiner — Credit Card Customer Behavior Mining",
  description:
    "Interactive dashboard for credit card churn prediction, customer segmentation, and risk analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
