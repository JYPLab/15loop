import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "부모 계정 | 15Loop",
  description: "15Loop 가족 학습 공간에서 아이별 진단과 15분 학습 기록을 확인하세요.",
  alternates: { canonical: "/parent" },
  robots: { index: false, follow: false },
};

export default function ParentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
