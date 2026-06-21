import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {Image, Money} from '@shopify/hydrogen';
import {GlassCard, Button} from '@slicedlabs/ui';
import {BRAND_NAME} from '@slicedlabs/brand';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `${data?.product?.title ?? 'Product'} | ${BRAND_NAME}`},
];

function hasRealToken(env: Env): boolean {
  const t = env.PUBLIC_STOREFRONT_API_TOKEN;
  return Boolean(t) && !/placeholder|xxx|your[-_]?token/i.test(t);
}

export async function loader({context, params}: Route.LoaderArgs) {
  const {storefront, env} = context;
  const handle = params.handle;
  if (!handle) throw new Response('Not found', {status: 404});

  if (!hasRealToken(env)) {
    return {handle, product: null, degraded: true as const};
  }

  const product = await storefront
    .query(PRODUCT_QUERY, {variables: {handle}})
    .then((data) => data?.product ?? null)
    .catch((error: Error) => {
      // eslint-disable-next-line no-console
      console.error('Product query failed:', error.message);
      return null;
    });

  return {handle, product, degraded: false as const};
}

export default function Product() {
  const {handle, product, degraded} = useLoaderData<typeof loader>();

  if (!product) {
    return (
      <div className="wrap" style={{paddingBlock: '4.5rem'}}>
        <GlassCard tier="focal" className="empty-state">
          <p className="mono">product · {handle}</p>
          <h3>Not available yet.</h3>
          <p style={{color: 'var(--muted)', margin: '0 auto', maxWidth: '28rem'}}>
            {degraded
              ? 'Storefront not connected — add real Storefront API credentials to load this product.'
              : "We couldn't find that product. It may have moved or sold out."}
          </p>
          <div style={{marginTop: '0.6rem'}}>
            <Button variant="ghost" href="/collections/all">
              Browse the catalog
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const price = product.selectedOrFirstAvailableVariant?.price ?? product.priceRange?.minVariantPrice;

  return (
    <div className="wrap" style={{paddingBlock: '4.5rem 4rem'}}>
      <div
        style={{
          display: 'grid',
          gap: '2rem',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          alignItems: 'start',
        }}
      >
        {product.featuredImage ? (
          <Image
            data={product.featuredImage}
            sizes="(min-width: 45em) 50vw, 100vw"
            alt={product.featuredImage.altText || product.title}
            style={{borderRadius: 'var(--radius-lg)', width: '100%'}}
          />
        ) : (
          <div className="product-card-media" aria-hidden="true" />
        )}

        <div style={{display: 'grid', gap: '0.8rem'}}>
          <p className="mono">{BRAND_NAME}</p>
          <h1 className="blend-text">{product.title}</h1>
          {price ? <Money data={price} style={{fontSize: 'var(--step-1)'}} /> : null}
          {product.description ? (
            <p style={{color: 'var(--muted)'}}>{product.description}</p>
          ) : null}
          <div>
            <Button
              href={product.selectedOrFirstAvailableVariant?.availableForSale ? '#' : undefined}
              disabled={!product.selectedOrFirstAvailableVariant?.availableForSale}
            >
              {product.selectedOrFirstAvailableVariant?.availableForSale
                ? 'Add to cart'
                : 'Sold out'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRODUCT_QUERY = `#graphql
  query ShopProduct(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      description
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
      selectedOrFirstAvailableVariant(selectedOptions: []) {
        id
        availableForSale
        price {
          amount
          currencyCode
        }
      }
    }
  }
` as const;
