import Script from "next/script";

// Pendo's install snippet, verbatim. It defines a `window.pendo` stub that queues calls until the agent loads.
const PENDO_SNIPPET = `(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-dev.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('5239035f-4fba-4439-bb5e-7cdf78179d2a');`;

// Initializing in the same inline script as the snippet runs initialize exactly once per page load, independent
// of React rendering. The visitor starts anonymous; PendoIdentify identifies the signed-in user.
// The location transforms keep credentials that some URLs carry out of what Pendo records:
// - /auth/forgot-password/<id>: the id is the password-reset credential.
// - /auth/verify-email-change?token=: the email-change verification token.
// - /auth/oauth2/authorize?state=: the OAuth client's state. Signed-out visitors carry the whole authorize query
//   to /auth/login in callbackUrl, and the login page's sign-up link forwards it to /signup in redirect.
// - /apps/<slug>/setup?code=: the OAuth authorization code returned to the payment apps' setup popups.
// token, state and code are ordinary parameter names elsewhere in the app, so they are only stripped on these pages.
const PENDO_INITIALIZE = `pendo.initialize({
  visitor: { id: "" },
  location: {
    transforms: [
      {
        attr: "pathname",
        action: "Replace",
        data: function (pathname) {
          var path = String(pathname || "");
          var prefix = "/auth/forgot-password/";
          if (path.indexOf(prefix) !== 0 || path.length === prefix.length) return pathname;
          return prefix + "redacted";
        }
      },
      {
        attr: "search",
        action: "ExcludeKeys",
        data: function (search, url) {
          var path = url && typeof url.pathname === "string" ? url.pathname : "";
          var segments = path.split("/");
          if (path === "/auth/verify-email-change") return ["token"];
          if (path === "/auth/oauth2/authorize") return ["state"];
          if (segments.length === 4 && segments[1] === "apps" && segments[3] === "setup") return ["code"];
          return [];
        }
      },
      {
        attr: "search",
        action: "Replace",
        data: function (search) {
          var raw = String(search || "");
          if (raw.indexOf("oauth2") === -1) return search;
          var params = new URLSearchParams(raw);
          var keys = [];
          var changed = false;
          params.forEach(function (value, key) {
            keys.push(key);
          });
          keys.forEach(function (key) {
            var value = params.get(key) || "";
            var cut = value.indexOf("?");
            if (cut === -1 || value.slice(0, cut).indexOf("oauth2/authorize") === -1) return;
            var nested = new URLSearchParams(value.slice(cut + 1));
            if (!nested.has("state")) return;
            nested.delete("state");
            params.set(key, value.slice(0, cut + 1) + nested.toString());
            changed = true;
          });
          if (!changed) return search;
          var rebuilt = params.toString();
          return rebuilt ? (raw.charAt(0) === "?" ? "?" : "") + rebuilt : "";
        }
      }
    ]
  }
});`;

export function PendoScript({ nonce }: { nonce?: string }): JSX.Element {
  return (
    <Script
      id="pendo-snippet"
      strategy="beforeInteractive"
      nonce={nonce}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Pendo's install snippet has to run as an inline script
      dangerouslySetInnerHTML={{ __html: `${PENDO_SNIPPET}\n${PENDO_INITIALIZE}` }}
    />
  );
}
