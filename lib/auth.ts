import { createClient } from "@supabase/supabase-js";

export type ParentIdentity = {
  id: string;
  email: string;
  displayName: string;
};

export class AuthRequiredError extends Error {
  status = 401;
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function getOptionalParent(request: Request): Promise<ParentIdentity | null> {
  const token = bearerToken(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !publishableKey) return null;

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;

  const metadata = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email,
    displayName: String(metadata.full_name || metadata.name || data.user.email.split("@")[0] || "보호자"),
  };
}

export async function requireParent(request: Request) {
  const parent = await getOptionalParent(request);
  if (!parent) throw new AuthRequiredError("Parent sign-in is required");
  return parent;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return null;
}
