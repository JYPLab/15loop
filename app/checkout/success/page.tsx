"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

export default function CheckoutSuccessPage() {
  const [state, setState] = useState<"confirming" | "paid" | "error">("confirming");
  const [message, setMessage] = useState("결제를 안전하게 승인하고 있어요…");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    const confirm = async () => {
      const client = getSupabaseBrowserClient();
      const { data } = client ? await client.auth.getSession() : { data: { session: null } };
      if (!data.session) {
        setState("error");
        setMessage("결제 승인을 위해 부모 계정으로 다시 로그인해주세요.");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey: params.get("paymentKey"), orderId: params.get("orderId"), amount: Number(params.get("amount")) }),
      });
      const result = await response.json() as { paid?: boolean; error?: string; receiptUrl?: string | null };
      if (!response.ok || !result.paid) {
        setState("error");
        setMessage(result.error || "결제 승인에 실패했습니다.");
        return;
      }
      setReceiptUrl(result.receiptUrl || null);
      setState("paid");
      setMessage("30일 이용권이 시작됐어요!");
    };
    void confirm();
  }, []);

  return (
    <main className="commerce-shell commerce-centered">
      <section className={`commerce-message-card ${state}`}>
        <span className={state === "confirming" ? "commerce-spinner" : "commerce-result-symbol"}>{state === "paid" ? "✓" : state === "error" ? "!" : ""}</span>
        <h1>{message}</h1>
        <p>{state === "paid" ? "부모 대시보드에서 아이별 학습을 바로 시작할 수 있습니다." : state === "error" ? "실제 출금 여부가 불확실하면 토스 결제내역을 먼저 확인해주세요." : "창을 닫지 말아주세요."}</p>
        {receiptUrl && <a href={receiptUrl} target="_blank" rel="noreferrer">결제 영수증 보기</a>}
        <a className="commerce-primary" href="/parent">부모 대시보드로 이동 <span>→</span></a>
      </section>
    </main>
  );
}
