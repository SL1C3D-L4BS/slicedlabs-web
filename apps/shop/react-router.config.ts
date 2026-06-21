import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

/**
 * React Router 7.16 configuration for Hydrogen.
 *
 * The official Hydrogen preset wires the validated React Router settings for
 * Shopify Oxygen deployment (SSR on, server bundle entry, etc.). Keep this thin
 * — let the preset own the defaults.
 */
export default {
  presets: [hydrogenPreset()],
} satisfies Config;
