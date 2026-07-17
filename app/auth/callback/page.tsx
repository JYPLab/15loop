"use client";

import { useEffect, useState } from "react";
import { authNextStorageKey, getSupabaseBrowserClient } from "../../../lib/supabase-browser";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/parent";
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("로그인을 확인하고 있어요…");

  useEffect(() => {
    const complete = async () => {
      const client = getSupabaseBrowserClient();
      if (!client) {
        setMessage("인증 환경 설정이 필요합니다.");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = safeNext(params.get("next") ?? window.localStorage.getItem(authNextStorageKey));
      window.localStorage.removeItem(authNextStorageKey);
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage("로그인 링크가 만료됐어요. 부모 로그인 화면에서 다시 시도해주세요.");
          return;
        }
      }
      window.location.replace(next);
    };
    void complete();
  }, []);

  return (
    <main className="commerce-shell commerce-centered">
      <section className="commerce-message-card"><span className="commerce-spinner" /><h1>{message}</h1><a href="/parent">부모 로그인으로 돌아가기</a></section>
    </main>
  );
}
