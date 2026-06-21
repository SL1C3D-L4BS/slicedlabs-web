import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {Image, Money} from '@shopify/hydrogen';
import {GlassCard, Button} from '@slicedlabs/ui';
import {MARK_PATH, BRAND_NAME, SLOGAN, ONE_LINER} from '@slicedlabs/brand';
import type {ShopFeaturedProductFragment} from 'storefrontapi.generated';

// Codegen (`npm run codegen`) generates this fragment type from the inline
// `#graphql` query below; before codegen has run, the committed stub keeps it
// resolvable.
type ProductCard = ShopFeaturedProductFragment;

export const meta: Route.MetaFunction = () => [
  {title: `${BRAND_NAME} — Shop`},
  {name: 'description', content: ONE_LINER},
];

// A token is "real" when it isn't the placeholder shipped in .env.example. This
// keeps a fresh clone (placeholder creds) from hammering the Storefront API and
// lets the page short-circuit straight to the empty state.
function hasRealToken(env: Env): boolean {
  const t = env.PUBLIC_STOREFRONT_API_TOKEN;
  return Boolean(t) && !/placeholder|xxx|your[-_]?token/i.test(t);
}

export async function loader({context}: Route.LoaderArgs) {
  const {storefront, env} = context;

  if (!hasRealToken(env)) {
    return {products: [] as ProductCard[], degraded: true as const};
  }

  // Never let a failed query break the render — degrade to the empty state.
  const products = await storefront
    .query(FEATURED_PRODUCTS_QUERY)
    .then((data) => (data?.products?.nodes ?? []) as ProductCard[])
    .catch((error: Error) => {
      // eslint-disable-next-line no-console
      console.error('Featured products query failed:', error.message);
      return [] as ProductCard[];
    });

  return {products, degraded: false as const};
}

export default function ShopHome() {
  const {products, degraded} = useLoaderData<typeof loader>();

  return (
    <div className="wrap">
      <section className="shop-hero">
        <img src={MARK_PATH} alt="" width={80} height={80} className="shop-hero-mark" />
        <p className="mono">{BRAND_NAME} · shop</p>
        <h1 className="kinetic blend-text shop-hero-title">{SLOGAN}</h1>
        <p className="shop-hero-sub">{ONE_LINER}</p>
        <div className="shop-hero-cta">
          <Button href="/collections/all">Browse the catalog →</Button>
          <Button variant="ghost" href="https://slicedlabs.io">
            Back to slicedlabs.io
          </Button>
        </div>
        <hr className="blade center shop-hero-blade" aria-hidden="true" />
      </section>

      <section aria-labelledby="featured" style={{paddingBlock: '1rem 4rem'}}>
        <h2 id="featured" style={{marginBottom: '1.2rem'}}>
          Featured
        </h2>

        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCardView key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <GlassCard tier="focal" className="empty-state">
            <p className="mono">no products yet</p>
            <h3>The kitchen&apos;s still prepping.</h3>
            <p style={{color: 'var(--muted)', margin: '0 auto', maxWidth: '28rem'}}>
              {degraded
                ? 'Storefront not connected yet — drop in real Storefront API credentials to light up the catalog.'
                : 'Products are on the way. Check back soon, or follow the build at slicedlabs.io.'}
            </p>
          </GlassCard>
        )}
      </section>
    </div>
  );
}

function ProductCardView({product}: {product: ProductCard}) {
  return (
    <Link
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
  );
}

const FEATURED_PRODUCTS_QUERY = `#graphql
  fragment ShopFeaturedProduct on Product {
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
  query ShopFeaturedProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...ShopFeaturedProduct
      }
    }
  }
` as const;
