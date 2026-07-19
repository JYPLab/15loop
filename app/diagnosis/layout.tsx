import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "무료 영어 단어 연결 진단 | 15Loop",
  description: "초등 5·6학년과 중학교 1학년을 위한 무료 영어 단어 진단. 뜻·소리·문장·떠올리기 중 어디에서 연결이 끊기는지 8~12분 안에 확인하세요.",
  alternates: { canonical: "/diagnosis" },
  robots: { index: true, follow: true },
};

export default function DiagnosisLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
