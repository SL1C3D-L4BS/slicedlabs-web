import {flatRoutes} from '@react-router/fs-routes';
import {type RouteConfig} from '@react-router/dev/routes';
import {hydrogenRoutes} from '@shopify/hydrogen';

// File-based routing (app/routes/*) wrapped by Hydrogen so its built-in routes
// (e.g. cart/account/redirects) are merged in. Manual routes can be appended.
export default hydrogenRoutes([
  ...(await flatRoutes()),
]) satisfies RouteConfig;
