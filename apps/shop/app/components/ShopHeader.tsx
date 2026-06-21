import {Link, useLocation} from 'react-router';
import {PillBar, icons, type PillNavItem} from '@slicedlabs/ui';
import {MARK_PATH, BRAND_NAME, SITE} from '@slicedlabs/brand';

// The storefront nav. The marketing-site chips (Manifesto, The Build, Watch,
// Truck, Workshops) live on the apex; here we surface the shop's own sections
// and link back to the apex for the rest. Same per-chip hues + class contract
// as apps/web Base.astro, so the bar renders pixel-equivalent.
const SHOP_NAV: PillNavItem[] = [
  {href: SITE.apex, label: 'Home', hue: '#38B6FF', icon: icons.home},
  {href: '/', label: 'Shop', hue: '#6C7BE8', icon: icons.shop},
  {href: '/collections/all', label: 'Catalog', hue: '#CB6820', icon: icons.build},
];

/**
 * ShopHeader — the cockpit pill bar for the Hydrogen storefront. Swaps in
 * React Router's <Link> for in-app client nav (external apex links fall back to
 * a plain <a>), and drives `.is-active` from the current pathname. Pixel-twin of
 * the Astro header (PillBar owns the dock magnification + the temp toggle).
 */
export function ShopHeader() {
  const {pathname} = useLocation();

  return (
    <PillBar
      markSrc={MARK_PATH}
      brand={BRAND_NAME}
      brandHref="/"
      items={SHOP_NAV}
      active={pathname}
      renderLink={({href, className, style, children, ...rest}) =>
        href.startsWith('http') ? (
          <a href={href} className={className} style={style} {...rest}>
            {children}
          </a>
        ) : (
          <Link to={href} className={className} style={style} {...rest}>
            {children}
          </Link>
        )
      }
    />
  );
}
