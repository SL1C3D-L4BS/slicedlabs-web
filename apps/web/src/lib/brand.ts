// SlicedLabs · studio · © 2026 SlicedLabs
// The chevron-S mark is operator-provided — NEVER generated. These assets now
// live permanently in public/ (from the brand asset-pack handoff), so they are
// referenced directly — no build-time fs gating (which is unreliable on Vercel's
// bundled SSR, where import.meta.url does not map back to the project's public/).
export const MARK_PATH = "/slicedlabs-mark.svg";
export const OG_PATH = "/og-image.png";

// One handle, @slicedlabs everywhere (YouTube = @slicedlaboratories). Used for the
// social row AND the schema.org `sameAs` that ties the brand's profiles together.
export const SOCIAL_URLS = [
  "https://www.youtube.com/channel/UCodcvZ6u4N4PACwxYaM8sTw",
  "https://instagram.com/slicedlabs",
  "https://tiktok.com/@slicedlabs",
  "https://x.com/slicedlabs",
  "https://pinterest.com/slicedlabs",
];

const base = (site: string) => site.replace(/\/$/, "");

/** schema.org Organization — for the homepage (entity + knowledge-panel signal). */
export function organizationLd(site: string) {
  const b = base(site);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SlicedLabs",
    url: b + "/",
    logo: b + MARK_PATH,
    description:
      "A food · media · marketing company building a real food empire in public. We don't pitch. We prove.",
    sameAs: SOCIAL_URLS,
  };
}

/** schema.org FoodEstablishment — for /truck (local search + map discovery). */
export function foodTruckLd(site: string) {
  const b = base(site);
  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: "SlicedLabs",
    servesCuisine: "Pacific Northwest",
    url: b + "/truck",
    image: b + OG_PATH,
    areaServed: { "@type": "City", name: "Spokane, WA" },
    sameAs: SOCIAL_URLS,
  };
}
