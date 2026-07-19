import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | 15Loop",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
