import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Booksy — Book local services",
    template: "%s | Booksy",
  },
  description:
    "Discover local businesses, check real-time availability, and book appointments for salon, clinic, spa and more.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f7fa] text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
