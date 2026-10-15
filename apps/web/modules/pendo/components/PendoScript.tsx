// Runs inline in <head> so the call queue exists before any client bundle (and PendoVisitorSync) executes,
// and so pendo.initialize happens exactly once per document load rather than on every React render.
// The location transforms keep credentials that some pages receive in their URL out of what Pendo records.
const PENDO_INSTALL_SCRIPT = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-dev.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('5239035f-4fba-4439-bb5e-7cdf78179d2a');

pendo.initialize({
  visitor: { id: '' },
  location: {
    transforms: [
      {
        // Password reset links carry the reset token as the last path segment.
        attr: 'pathname',
        action: 'Replace',
        data: function (pathname) {
          var path = String(pathname || '');
          var resetPrefix = '/auth/forgot-password/';
          return path.indexOf(resetPrefix) === 0 && path.length > resetPrefix.length
            ? resetPrefix + 'redacted'
            : path;
        }
      },
      {
        // Transforms apply to every recorded URL, so keys are only dropped on the pages that receive a credential.
        attr: 'search',
        action: 'ExcludeKeys',
        data: function (search, url) {
          var path = String((url && url.pathname) || '');
          var segments = path.split('/');
          if (path === '/signup' || path === '/teams' || path === '/auth/verify-email-change') {
            return ['token'];
          }
          if (path === '/auth/login') {
            // Existing users who open an invite link are sent here with the invite token nested in callbackUrl.
            return String(search || '').toLowerCase().indexOf('token') === -1 ? ['totp'] : ['totp', 'callbackUrl'];
          }
          if (path === '/auth/oauth2/authorize') {
            return ['state'];
          }
          if (segments.length === 4 && segments[1] === 'apps' && segments[3] === 'setup') {
            return ['code'];
          }
          return [];
        }
      }
    ]
  }
});
`;

type PendoScriptProps = {
  nonce?: string;
};

export function PendoScript({ nonce }: PendoScriptProps): JSX.Element {
  return (
    <script
      nonce={nonce}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Pendo's install snippet has to run inline, ahead of the app bundles
      dangerouslySetInnerHTML={{ __html: PENDO_INSTALL_SCRIPT }}
    />
  );
}
