async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secureEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let mismatch = leftDigest.length ^ rightDigest.length;
  const length = Math.max(leftDigest.length, rightDigest.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftDigest[index] ?? 0) ^ (rightDigest[index] ?? 0);
  }
  return mismatch === 0;
}

export async function contentAdminError(request: Request) {
  const expected = process.env.CONTENT_ADMIN_TOKEN?.trim() ?? "";
  if (!expected) {
    return Response.json({ error: "Content administration is not configured" }, { status: 503 });
  }
  const supplied = request.headers.get("x-content-admin-token")?.trim() ?? "";
  if (!supplied || !(await secureEqual(supplied, expected))) {
    return Response.json({ error: "Content administrator authentication is required" }, { status: 401 });
  }
  return null;
}

export function contentReviewer(request: Request) {
  return (request.headers.get("x-content-reviewer") ?? "content-admin")
    .replace(/[^a-zA-Z0-9@._-]/g, "")
    .slice(0, 120) || "content-admin";
}
