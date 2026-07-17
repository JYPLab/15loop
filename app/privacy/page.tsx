import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="commerce-shell legal-shell">
      <header className="commerce-topbar"><Link className="brand" href="/"><span className="brand-mark">15</span><span>15LOOP</span></Link><Link className="commerce-text-link" href="/parent">부모 계정</Link></header>
      <article className="legal-card">
        <span className="commerce-kicker">OPEN BETA · 2026-07-17</span>
        <h1>15Loop 개인정보 처리방침</h1>
        <p>15Loop는 부모 계정을 중심으로 필요한 정보만 처리하고, 아이에게 이메일·전화번호·학교명 입력을 요구하지 않습니다.</p>
        <h2>1. 처리하는 정보</h2>
        <ul>
          <li>보호자: 로그인 이메일, 표시 이름, 약관·개인정보 동의 기록</li>
          <li>학습자: 보호자가 정한 닉네임, 학년, 진단 답안·점수, 단어별 학습·평가 기록, 학습시간</li>
          <li>결제 시: 주문번호, 이용권, 금액, 결제 상태와 영수증 정보</li>
          <li>오픈 베타 운영: 기능 이용 단계와 부모가 직접 작성한 피드백</li>
        </ul>
        <h2>2. 이용 목적</h2>
        <p>가족 계정 운영, 맞춤 복습과 AI 평가, 학습 리포트, 무료 체험·이용권 관리, 오류 대응 및 오픈 베타 개선에 사용합니다.</p>
        <h2>3. 외부 서비스 이용</h2>
        <ul>
          <li>Supabase: 부모 이메일 인증</li>
          <li>OpenAI: 학습 답안 평가. 계정 이메일이나 아이 닉네임은 평가 요청에 포함하지 않습니다.</li>
          <li>OpenAI Sites·Cloudflare 기반 저장소: 서비스 제공과 학습 기록 저장</li>
          <li>토스페이먼츠: 보호자가 결제를 시작한 경우 결제 처리</li>
        </ul>
        <h2>4. 보호자와 아동 정보</h2>
        <p>아이 프로필과 진단은 보호자가 로그인하고 동의한 뒤에만 가족 계정에 연결됩니다. 만 14세 미만 학습자 정보에 대해서는 보호자 확인이 중요합니다. 현재 베타는 보호자 이메일 로그인과 확인 절차를 사용하며, 상용 운영 전 추가 확인 방식과 법률 검토를 진행합니다.</p>
        <h2>5. 보유와 삭제</h2>
        <p>서비스 제공에 필요한 동안 보유하며, 부모의 삭제 요청 또는 베타 종료 후 목적이 끝난 정보는 삭제합니다. 관계 법령상 보존 의무가 있는 결제 기록은 해당 기간 동안 별도 보관할 수 있습니다.</p>
        <h2>6. 권리와 요청</h2>
        <p>보호자는 부모 대시보드에서 학습 기록을 확인할 수 있으며, 열람·정정·삭제·처리 중지 요청은 오픈 베타 피드백을 통해 접수할 수 있습니다.</p>
        <h2>7. 안전 조치</h2>
        <p>보호자 인증, 자녀별 접근 권한 확인, 서버 저장, 관리자 전용 콘텐츠 검수, 최소 수집 원칙을 적용합니다. 피드백에는 아이의 실명·학교·연락처를 적지 않도록 안내합니다.</p>
        <div className="legal-actions"><Link href="/terms">이용약관 보기</Link><Link href="/parent">부모 계정으로 돌아가기</Link></div>
      </article>
    </main>
  );
}
