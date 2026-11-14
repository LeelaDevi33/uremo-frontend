"use client";

import { useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/api";

export default function ArticleView({ slug }: { slug: string }) {
  const counted = useRef("");
  useEffect(() => {
    if (counted.current === slug) return;
    counted.current = slug;
    // Page views have no bearing on delivery. An ambiguous response must not be retried.
    void fetch(`${getApiBaseUrl()}/api/blogs/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);
  return null;
}
