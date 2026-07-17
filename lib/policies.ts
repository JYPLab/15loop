export const TERMS_VERSION = "2026-07-17-beta";
export const PRIVACY_VERSION = "2026-07-17-beta";

export function hasCurrentGuardianConsent(account: {
  termsVersion: string;
  privacyVersion: string;
  guardianConfirmed: boolean;
  consentAcceptedAt: string | null;
}) {
  return account.termsVersion === TERMS_VERSION
    && account.privacyVersion === PRIVACY_VERSION
    && account.guardianConfirmed
    && Boolean(account.consentAcceptedAt);
}
