type PendoMetadataValue = string | number | boolean | null | undefined;

type PendoVisitor = { id: string | number } & Record<string, PendoMetadataValue>;

// Pendo calls transforms with its own parsed URL. When a transform throws, the agent records the
// untransformed URL instead, leaking the very credential being stripped, so inputs are treated as untrusted.
type PendoUrl = { pathname?: string };

type PendoLocationTransform =
  | {
      attr: "search";
      action: "ExcludeKeys";
      data: (search: string | undefined, url: PendoUrl | undefined) => string[];
    }
  | { attr: "pathname"; action: "Replace"; data: (pathname: string | undefined) => string };

type Pendo = {
  initialize: (options: {
    visitor: PendoVisitor;
    location?: { transforms: PendoLocationTransform[] };
    events?: { ready?: () => void };
  }) => void;
  identify: (options: { visitor: PendoVisitor }) => void;
  // The install snippet doesn't stub these, so they only exist once the agent script has loaded.
  isReady?: () => boolean;
  isAnonymousVisitor?: () => boolean;
  clearSession?: () => void;
};

declare global {
  interface Window {
    pendo?: Pendo;
  }
}

const PENDO_READY_EVENT = "pendo:ready";

// Pages that receive a credential in their query string: the email-change verification link
// (packages/features/auth/lib/verifyEmail.ts), team invite tokens (lib/signup/getServerSideProps.tsx, relayed
// to /teams by modules/signup-view.tsx) and the OAuth state on Cal.diy's own OAuth consent page.
const CREDENTIAL_QUERY_KEYS_BY_PATHNAME: Map<string, string[]> = new Map([
  ["/auth/verify-email-change", ["token"]],
  ["/signup", ["token"]],
  ["/teams", ["token"]],
  ["/auth/oauth2/authorize", ["state"]],
]);
// Alby, HitPay and BTCPay Server finish their OAuth popups on the app setup page with ?code=.
const APP_SETUP_PATHNAME = /^\/apps\/[^/]+\/setup$/;
// Login and signup carry the URL to return to, which can be an OAuth consent or team invite URL.
const RELAY_PATHNAMES: Set<string> = new Set(["/auth/login", "/signup"]);
const RELAY_QUERY_KEYS: string[] = ["callbackUrl", "redirect"];
const RELAYED_CREDENTIAL = /(?:[?&]|%3F|%26)(?:token|state|code)(?:=|%3D)/i;
// Password reset links carry the reset token as a path segment.
const PASSWORD_RESET_PATHNAME = /^(\/auth\/forgot-password\/)[^/]+/;

function getCredentialQueryKeys(search: string | undefined, url: PendoUrl | undefined): string[] {
  const pathname = url?.pathname ?? "";
  const params = new URLSearchParams(String(search ?? ""));
  const keys = [...(CREDENTIAL_QUERY_KEYS_BY_PATHNAME.get(pathname) ?? [])];
  if (APP_SETUP_PATHNAME.test(pathname)) {
    keys.push("code");
  }
  if (RELAY_PATHNAMES.has(pathname)) {
    keys.push(...RELAY_QUERY_KEYS.filter((key) => RELAYED_CREDENTIAL.test(params.get(key) ?? "")));
  }
  // URLs that carry none of these keys are left exactly as they are.
  return keys.filter((key) => params.has(key));
}

function redactPasswordResetToken(pathname: string | undefined): string {
  return String(pathname ?? "").replace(PASSWORD_RESET_PATHNAME, "$1redacted");
}

export function initializePendo(): void {
  window.pendo?.initialize({
    visitor: { id: "" },
    location: {
      transforms: [
        { attr: "search", action: "ExcludeKeys", data: getCredentialQueryKeys },
        { attr: "pathname", action: "Replace", data: redactPasswordResetToken },
      ],
    },
    events: {
      ready: (): void => {
        window.dispatchEvent(new Event(PENDO_READY_EVENT));
      },
    },
  });
}

export function identifyPendoVisitor(visitor: PendoVisitor): void {
  window.pendo?.identify({ visitor });
}

export function onPendoReady(callback: () => void): () => void {
  const unsubscribe = (): void => window.removeEventListener(PENDO_READY_EVENT, callback);
  if (window.pendo?.isReady?.()) {
    callback();
    return unsubscribe;
  }
  window.addEventListener(PENDO_READY_EVENT, callback, { once: true });
  return unsubscribe;
}

export function clearIdentifiedPendoSession(): void {
  const pendo = window.pendo;
  if (!pendo?.isAnonymousVisitor || pendo.isAnonymousVisitor()) return;
  pendo.clearSession?.();
}

export type { PendoVisitor };
