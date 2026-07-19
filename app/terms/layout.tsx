import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "오픈 베타 이용약관 | 15Loop",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
