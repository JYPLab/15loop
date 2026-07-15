"use client";

import { useEffect, useState } from "react";

export default function CheckoutFailPage() {
  const [message, setMessage] = useState("결제가 완료되지 않았습니다.");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code === "PAY_PROCESS_CANCELED") setMessage("결제가 취소됐어요. 원할 때 다시 진행할 수 있습니다.");
      else if (params.get("message")) setMessage(params.get("message")!.slice(0, 180));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <main className="commerce-shell commerce-centered">
      <section className="commerce-message-card error"><span className="commerce-result-symbol">!</span><h1>{message}</h1><p>이용권은 시작되지 않았고 다시 결제할 수 있습니다.</p><a className="commerce-primary" href="/parent">요금제로 돌아가기 <span>→</span></a></section>
    </main>
  );
}
