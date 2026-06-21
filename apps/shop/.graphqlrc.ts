import {getSchema} from '@shopify/hydrogen-codegen';
import type {IGraphQLConfig} from 'graphql-config';

/**
 * GraphQL config powering `shopify hydrogen codegen` — generates
 * storefrontapi.generated.d.ts from the inline `#graphql` queries in app/.
 */
export default {
  projects: {
    default: {
      schema: getSchema('storefront'),
      documents: [
        './*.{ts,tsx,js,jsx}',
        './app/**/*.{ts,tsx,js,jsx}',
        '!./app/graphql/**/*.{ts,tsx,js,jsx}',
      ],
    },
  },
} as IGraphQLConfig;
