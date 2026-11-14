const publicProjectOrigin = "https://uremo-frontend.vercel.app";

export function getSiteOrigin(configuredUrl?: string) {
  return configuredUrl?.trim().replace(/\/+$/, "") || publicProjectOrigin;
}

export const siteOrigin = getSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
