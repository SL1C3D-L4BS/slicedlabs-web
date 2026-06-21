import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from 'react-router';
import type {Route} from './+types/root';

// tokens (dark #161619 base + [data-temp="warm"] cream law) → component contract
// → Tailwind base. ONE body, same class contract as the Astro marketing site.
import tokensCss from '@slicedlabs/tokens/tokens.css?url';
import p3Css from '@slicedlabs/tokens/p3.css?url';
import uiCss from '@slicedlabs/ui/ui.css?url';
import appCss from '~/styles/app.css?url';

import {ShopHeader} from '~/components/ShopHeader';

export const links: Route.LinksFunction = () => [
  {rel: 'preconnect', href: 'https://cdn.shopify.com'},
  {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
  {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous'},
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300..800&family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..600&display=swap',
  },
  {rel: 'stylesheet', href: tokensCss},
  {rel: 'stylesheet', href: p3Css},
  {rel: 'stylesheet', href: uiCss},
  {rel: 'stylesheet', href: appCss},
];

/**
 * Inline, render-blocking script that sets <html data-temp> BEFORE first paint,
 * from the apex-scoped `sl-temp` cookie / localStorage — keeps the dark↔warm
 * temperature continuous across slicedlabs.io subdomains (no flash of the wrong
 * palette). Mirrors the inline twin in apps/web Base.astro.
 */
const TEMP_INIT = `(function(){try{var c=(document.cookie.match(/(?:^|;\\s*)sl-temp=(warm|dark)/)||[])[1];var s=c||localStorage.getItem("sl-temp");if(s==="warm"||s==="dark")document.documentElement.setAttribute("data-temp",s);}catch(e){}})();`;

export function Layout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" data-temp="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#161619" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{__html: TEMP_INIT}} />
        <Meta />
        <Links />
      </head>
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <ShopHeader />
        <main id="main">{children}</main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let message = 'Something hiccupped on our end.';
  let details = 'Try again in a moment.';

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? 'Page not found' : 'Error';
    details = error.data?.message ?? error.data ?? details;
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <div className="wrap" style={{paddingBlock: '4rem'}}>
      <p className="mono">{message}</p>
      <h1 className="blend-text" style={{fontSize: 'clamp(1.8rem,6vw,3rem)'}}>
        We don&apos;t pitch. We prove.
      </h1>
      <p style={{color: 'var(--muted)'}}>{details}</p>
    </div>
  );
}
