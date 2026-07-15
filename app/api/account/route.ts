import { getOptionalParent } from "../../../lib/auth";

export async function GET(request: Request) {
  const parent = await getOptionalParent(request);
  if (!parent) return Response.json({ authenticated: false });
  return Response.json({
    authenticated: true,
    user: { displayName: parent.displayName, email: parent.email },
  });
}

export async function POST() {
  return Response.json({ error: "진단 결과 연결은 부모 대시보드에서 진행해주세요." }, { status: 405 });
}
