import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  title: "The Indian Aisle",
  description: "Plan and tweak a wedding budget with live totals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AppNav />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
