import { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/siteOrigin";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteOrigin,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteOrigin}/explore-services`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteOrigin}/apply-to-work`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/login`,
      lastModified: new Date(),
      changeFrequency: "never",
      priority: 0.5,
    },
    {
      url: `${siteOrigin}/signup`,
      lastModified: new Date(),
      changeFrequency: "never",
      priority: 0.5,
    },
  ];
}
