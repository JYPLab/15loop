import type { Metadata } from "next";
import { AnalyticsPageView } from "./analytics-page-view";
import "./globals.css";

const siteUrl = "https://15loop.com";

function validToken(value: string | undefined) {
  return value?.trim() || undefined;
}

export function generateMetadata(): Metadata {
  const title = "15Loop | 초5·6·중1 AI 영어 단어 진단";
  const description = "외운 단어의 뜻·소리·문장·떠올리기 연결을 확인하고, 약한 연결부터 매일 15분 학습하는 7일 무료 오픈 베타입니다.";
  const googleVerification = validToken(process.env.GOOGLE_SITE_VERIFICATION);
  const naverVerification = validToken(process.env.NAVER_SITE_VERIFICATION);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: ["중학교 영어 단어", "초등 영어 단어", "영어 단어 진단", "영단어 발음", "AI 영어 학습", "15Loop"],
    alternates: { canonical: "/diagnosis" },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/diagnosis",
      siteName: "15Loop",
      locale: "ko_KR",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "15Loop AI 영어 단어 연결 진단" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
    verification: {
      ...(googleVerification ? { google: googleVerification } : {}),
      ...(naverVerification ? { other: { "naver-site-verification": naverVerification } } : {}),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const measurementId = process.env.GA_MEASUREMENT_ID?.trim() ?? "";
  const validMeasurementId = /^G-[A-Z0-9]+$/.test(measurementId) ? measurementId : "";

  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f3f1e9" />
        {validMeasurementId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${validMeasurementId}`} />
            <script dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${validMeasurementId}', {
                send_page_view: false,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
              });
            ` }} />
          </>
        )}
      </head>
      <body>
        {validMeasurementId && <AnalyticsPageView measurementId={validMeasurementId} />}
        {children}
      </body>
    </html>
  );
}
