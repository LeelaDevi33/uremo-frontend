import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getApiBaseUrl } from "@/lib/api";
import BlogContent, { type Blog } from "./BlogContent";
import ArticleView from "./ArticleView";

type Props = { params: Promise<{ slug: string }> };

// Metadata and speculative rendering can read the article before a visitor opens it.
const getArticle = cache(async (slug: string): Promise<Blog | null> => {
  const res = await fetch(`${getApiBaseUrl()}/api/blogs/${encodeURIComponent(slug)}?countView=false`, {
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("The article could not be loaded.");
  const data = await res.json();
  if (!data?.ok || typeof data.blog?.content !== "string") throw new Error("The article could not be loaded.");
  return data.blog;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const blog = await getArticle((await params).slug);
  if (!blog) return { title: "Article unavailable", robots: { index: false } };
  const description = blog.excerpt || blog.title;
  const images = blog.featuredImage ? [blog.featuredImage] : [];
  return {
    title: blog.title, description,
    openGraph: { title: blog.title, description, images, type: "article" },
    twitter: { title: blog.title, description, images, card: "summary_large_image" },
  };
}

export default async function BlogPage({ params }: Props) {
  const blog = await getArticle((await params).slug);
  if (!blog) notFound();
  return <><BlogContent blog={blog} /><ArticleView slug={blog.slug} /></>;
}
