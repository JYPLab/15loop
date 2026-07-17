import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="commerce-shell legal-shell">
      <header className="commerce-topbar"><Link className="brand" href="/"><span className="brand-mark">15</span><span>15LOOP</span></Link><Link className="commerce-text-link" href="/parent">부모 계정</Link></header>
      <article className="legal-card">
        <span className="commerce-kicker">OPEN BETA · 2026-07-17</span>
        <h1>15Loop 오픈 베타 이용약관</h1>
        <p>15Loop는 보호자가 자녀의 영어 진단과 15분 학습 기록을 관리하는 오픈 베타 서비스입니다. 본 약관은 베타 기간의 기본 이용 조건을 설명합니다.</p>
        <h2>1. 계정과 이용 대상</h2>
        <p>계정은 보호자가 만들고 관리합니다. 아이에게 이메일·비밀번호 입력을 요구하지 않으며, 보호자는 등록할 학습자를 관리할 권한이 있어야 합니다.</p>
        <h2>2. 무료 체험과 이용권</h2>
        <p>부모 계정 생성 시 7일 무료 체험이 시작됩니다. 별도 결제 전에는 자동 결제되지 않습니다. 유료 이용권의 가격·기간·학습자 수는 결제 전에 화면에 표시합니다.</p>
        <h2>3. AI 평가의 한계</h2>
        <p>AI 평가는 학습 보조 정보이며 학교 성적, 공인 시험 결과, 교사의 전문적 판단을 대체하지 않습니다. 오류가 있을 수 있으므로 부모 대시보드에서 피드백을 보낼 수 있습니다.</p>
        <h2>4. 이용자 주의사항</h2>
        <p>타인의 개인정보, 학교 정보, 연락처 또는 유해한 내용을 입력하거나 서비스의 보안·운영을 방해해서는 안 됩니다. 친구 챌린지는 사적인 링크로만 공유하고 공개 게시를 피해주세요.</p>
        <h2>5. 베타 서비스 변경</h2>
        <p>베타 기간에는 기능·가격·콘텐츠가 변경되거나 일시 중단될 수 있습니다. 중요한 변경은 서비스 화면을 통해 알립니다.</p>
        <h2>6. 문의</h2>
        <p>오류, 콘텐츠 이의 제기, 개인정보 요청은 로그인 후 부모 대시보드의 오픈 베타 피드백을 이용해주세요.</p>
        <div className="legal-actions"><Link href="/privacy">개인정보 처리방침 보기</Link><Link href="/parent">부모 계정으로 돌아가기</Link></div>
      </article>
    </main>
  );
}
