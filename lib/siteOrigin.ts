// Use the public project domain for crawlers, including on preview builds.
export const siteOrigin = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://uremo-frontend.vercel.app")
).replace(/\/+$/, "");
