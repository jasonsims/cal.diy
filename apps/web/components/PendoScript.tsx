// A plain inline script runs while the document is parsed, so window.pendo exists by the time
// instrumentation-client.ts calls pendo.initialize(). next/script tags, even beforeInteractive, run later.
const PENDO_INSTALL_SNIPPET = `(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-dev.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('5239035f-4fba-4439-bb5e-7cdf78179d2a');`;

export function PendoScript({ nonce }: { nonce?: string }): JSX.Element {
  return (
    <script
      id="pendo-install-snippet"
      nonce={nonce}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Pendo's install snippet is a static constant
      dangerouslySetInnerHTML={{ __html: PENDO_INSTALL_SNIPPET }}
    />
  );
}
