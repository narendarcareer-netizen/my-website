import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JobPilot — Your job search, organized", template: "%s | JobPilot" },
  description: "Discover better-fit roles, prepare stronger applications, and track every opportunity in one calm workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="font-sans">{children}</body></html>;
}
