import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { PendoScript } from "./PendoScript";

type LocationTransform = {
  attr: string;
  action: string;
  data: (value?: string, url?: URL) => string | string[] | undefined;
};

type InitializeOptions = {
  visitor: { id: string };
  location: { transforms: LocationTransform[] };
};

type InsertedScript = { src?: string; async?: boolean };

type InlineScriptRun = {
  queue: [string, InitializeOptions][];
  insertedScripts: InsertedScript[];
};

const BASE_URL = "https://cal-diy-chi.vercel.app";

function runInlineScript(html: string): InlineScriptRun {
  const insertedScripts: InsertedScript[] = [];
  const firstScript = {
    parentNode: { insertBefore: (script: InsertedScript): number => insertedScripts.push(script) },
  };
  const sandbox: Record<string, unknown> = {
    URLSearchParams,
    document: {
      createElement: (): InsertedScript => ({}),
      getElementsByTagName: (): (typeof firstScript)[] => [firstScript],
    },
  };
  // The snippet runs as a classic browser script, where `window` is the global object.
  sandbox.window = sandbox;
  vm.runInNewContext(html, sandbox);
  const pendo = sandbox.pendo as { _q: [string, InitializeOptions][] };
  return { queue: pendo._q, insertedScripts };
}

const element: JSX.Element = PendoScript({ nonce: "test-nonce" });
const { queue, insertedScripts }: InlineScriptRun = runInlineScript(
  element.props.dangerouslySetInnerHTML.__html
);
const [pathnameTransform, excludeKeysTransform, nestedStateTransform]: LocationTransform[] =
  queue[0][1].location.transforms;

function excludedKeys(path: string): string | string[] | undefined {
  const url = new URL(path, BASE_URL);
  return excludeKeysTransform.data(url.search, url);
}

function nestedStateScrubbed(path: string): string | string[] | undefined {
  const url = new URL(path, BASE_URL);
  return nestedStateTransform.data(url.search, url);
}

describe("PendoScript", () => {
  it("renders the snippet as a beforeInteractive inline script carrying the CSP nonce", () => {
    expect(element.props).toMatchObject({
      id: "pendo-snippet",
      strategy: "beforeInteractive",
      nonce: "test-nonce",
    });
  });

  it("loads the agent for this install's API key", () => {
    expect(insertedScripts).toEqual([
      {
        async: true,
        src: "https://cdn.pendo-dev.pendo-dev.com/agent/static/5239035f-4fba-4439-bb5e-7cdf78179d2a/pendo.js",
      },
    ]);
  });

  it("initializes exactly once, with an anonymous visitor", () => {
    expect(queue.map(([method]) => method)).toEqual(["initialize"]);
    expect(queue[0][1].visitor).toEqual({ id: "" });
  });

  it("only registers attribute/action pairs that the Location API accepts", () => {
    expect(queue[0][1].location.transforms.map(({ attr, action }) => [attr, action])).toEqual([
      ["pathname", "Replace"],
      ["search", "ExcludeKeys"],
      ["search", "Replace"],
    ]);
  });

  describe("location transforms", () => {
    it("redacts the reset credential from password-reset links", () => {
      expect(pathnameTransform.data("/auth/forgot-password/clx1reset2id")).toBe(
        "/auth/forgot-password/redacted"
      );
    });

    it.each([
      "/auth/forgot-password",
      "/auth/forgot-password/",
      "/event-types",
      "/booking/abc",
    ])("leaves %s untouched", (path) => {
      expect(pathnameTransform.data(path)).toBe(path);
    });

    it.each([
      ["/auth/verify-email-change?token=abc", ["token"]],
      ["/auth/oauth2/authorize?client_id=c&state=s", ["state"]],
      ["/apps/alby/setup?callback=true&code=c", ["code"]],
      ["/apps/btcpayserver/setup?callback=true&code=c", ["code"]],
    ])("strips the credential from %s", (path, keys) => {
      expect(excludedKeys(path)).toEqual(keys);
    });

    it.each([
      "/signup?token=t",
      "/bookings/upcoming?state=s",
      "/apps/alby?code=c",
      "/apps/alby/setup/extra?code=c",
    ])("keeps ordinary parameters on %s", (path) => {
      expect(excludedKeys(path)).toEqual([]);
    });

    it("strips state from an authorize URL that login carries in callbackUrl", () => {
      const callbackUrl = "auth/oauth2/authorize?client_id=c&scope=READ_PROFILE&state=s";
      const scrubbed = nestedStateScrubbed(`/auth/login?${new URLSearchParams({ callbackUrl })}`);

      expect(typeof scrubbed).toBe("string");
      expect(new URLSearchParams(scrubbed as string).get("callbackUrl")).toBe(
        "auth/oauth2/authorize?client_id=c&scope=READ_PROFILE"
      );
    });

    it("strips state from an authorize URL that signup carries in redirect", () => {
      const redirect = `${BASE_URL}/auth/oauth2/authorize?client_id=c&state=s`;
      const scrubbed = nestedStateScrubbed(`/signup?${new URLSearchParams({ redirect })}`);

      expect(new URLSearchParams(scrubbed as string).get("redirect")).toBe(
        `${BASE_URL}/auth/oauth2/authorize?client_id=c`
      );
    });

    it.each([
      `/auth/login?${new URLSearchParams({ callbackUrl: `${BASE_URL}/event-types` })}`,
      `/auth/login?${new URLSearchParams({ callbackUrl: "auth/oauth2/authorize?client_id=c" })}`,
      `/auth/oauth2/authorize?${new URLSearchParams({ redirect_uri: "https://client.example/oauth2/cb" })}`,
      "/event-types",
    ])("returns the query string of %s unchanged", (path) => {
      const url = new URL(path, BASE_URL);
      expect(nestedStateScrubbed(path)).toBe(url.search);
    });

    it("tolerates missing input instead of throwing", () => {
      expect(pathnameTransform.data(undefined)).toBeUndefined();
      expect(excludeKeysTransform.data(undefined, undefined)).toEqual([]);
      expect(nestedStateTransform.data(undefined)).toBeUndefined();
    });
  });
});
