type EntryRouteInput = {
  authenticated: boolean;
  learnerId: string;
  hasChallenge: boolean;
};

export type EntryDestination = "learn" | "diagnosis" | "parent";

export function entryDestination({ authenticated, learnerId, hasChallenge }: EntryRouteInput): EntryDestination {
  if (hasChallenge) return "learn";
  const hasSelectedChild = /^child-[0-9a-f-]{36}$/i.test(learnerId);
  if (!authenticated) return hasSelectedChild ? "parent" : "diagnosis";
  if (hasSelectedChild) return "learn";
  return "parent";
}
