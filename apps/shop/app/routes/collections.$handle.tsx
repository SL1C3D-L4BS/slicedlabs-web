import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {Image, Money} from '@shopify/hydrogen';
import {GlassCard} from '@slicedlabs/ui';
import {BRAND_NAME} from '@slicedlabs/brand';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `${data?.collection?.title ?? 'Catalog'} | ${BRAND_NAME}`},
];

function hasRealToken(env: Env): boolean {
  const t = env.PUBLIC_STOREFRONT_API_TOKEN;
  return Boolean(t) && !/placeholder|xxx|your[-_]?token/i.test(t);
}

export async function loader({context, params}: Route.LoaderArgs) {
  const {storefront, env} = context;
  const handle = params.handle || 'all';

  // No real creds → render the page with an empty collection (build/preview-safe).
  if (!hasRealToken(env)) {
    return {handle, collection: null, degraded: true as const};
  }

  const collection = await storefront
    .query(COLLECTION_QUERY, {variables: {handle}})
    .then((data) => data?.collection ?? null)
    .catch((error: Error) => {
      // eslint-disable-next-line no-console
      console.error('Collection query failed:', error.message);
      return null;
    });

  return {handle, collection, degraded: false as const};
}

export default function Collection() {
  const {handle, collection, degraded} = useLoaderData<typeof loader>();
  const products = collection?.products?.nodes ?? [];

  return (
    <div className="wrap" style={{paddingBlock: '4.5rem 4rem'}}>
      <p className="mono">{BRAND_NAME} · collection</p>
      <h1 className="blend-text" style={{marginBottom: '0.4rem'}}>
        {collection?.title ?? handle}
      </h1>
      {collection?.description ? (
        <p style={{color: 'var(--muted)', maxWidth: '40rem', marginBottom: '1.6rem'}}>
          {collection.description}
        </p>
      ) : null}
      <hr className="blade" aria-hidden="true" />

      {products.length > 0 ? (
        <div className="product-grid" style={{marginTop: '1.6rem'}}>
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.handle}`}
              className="glass island"
              style={{display: 'grid', gap: '0.6rem', textDecoration: 'none'}}
            >
              {product.featuredImage ? (
                <Image
                  data={product.featuredImage}
                  className="product-card-media"
                  sizes="(min-width: 45em) 20vw, 50vw"
                  alt={product.featuredImage.altText || product.title}
                />
              ) : (
                <div className="product-card-media" aria-hidden="true" />
              )}
              <strong>{product.title}</strong>
              <Money data={product.priceRange.minVariantPrice} className="mono" />
            </Link>
          ))}
        </div>
      ) : (
        <GlassCard tier="focal" className="empty-state" style={{marginTop: '1.6rem'}}>
          <p className="mono">empty collection</p>
          <h3>Nothing here yet.</h3>
          <p style={{color: 'var(--muted)', margin: '0 auto', maxWidth: '28rem'}}>
            {degraded
              ? 'Storefront not connected — add real Storefront API credentials to load this collection.'
              : 'No products in this collection yet. Check back soon.'}
          </p>
        </GlassCard>
      )}
    </div>
  );
}

const COLLECTION_QUERY = `#graphql
  fragment CollectionProduct on Product {
    id
    title
    handle
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
  query ShopCollection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      products(first: 24, sortKey: BEST_SELLING) {
        nodes {
          ...CollectionProduct
        }
      }
    }
  }
` as const;
