import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

// Custom context merged into the Hydrogen context. Available as both
// `context.propertyName` and `context.get(propertyContext)`.
const additionalContext = {
  // cms: await createCMSClient(env),
} as const;

type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}

  // Make context.cart return the codegen'd cart shape from CART_QUERY_FRAGMENT.
  interface HydrogenCustomCartFragment extends CartApiQueryFragment {}
}

/**
 * Build the Hydrogen context for React Router 7.16. Opens the worker cache and a
 * cookie session, then wires the Storefront client (built from the PUBLIC_STORE_*
 * env vars), cart, and customer account clients.
 */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );

  return hydrogenContext;
}
