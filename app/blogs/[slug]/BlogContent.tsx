"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { withCacheBust } from "@/lib/cacheBust";

// PATCH_21: Category labels for blog display
const CATEGORY_LABELS: Record<string, string> = {
  opportunities: "Project opportunities",
  microjobs: "Work and gigs",
  guides: "Guides",
  general: "General",
};

interface RelatedService {
  _id: string;
  title: string;
  slug?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
  subcategory?: string;
}

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category: string;
  featuredImage?: string;
  createdAt: string;
  updatedAt?: string;
  readingTime?: number;
  viewCount?: number;
  createdBy?: { name?: string };
  relatedServices: RelatedService[];
}

interface BlogContentProps {
  slug: string;
}

export default function BlogContent({ slug }: BlogContentProps) {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlog = async () => {
      try {
        setLoading(true);
        const res = await apiRequest(`/api/blogs/${slug}`);
        if (res?.ok && res?.blog) {
          setBlog(res.blog);
        } else {
          setError("Blog not found");
        }
      } catch (err) {
        console.error("Failed to load blog:", err);
        setError("Failed to load blog");
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#0F172A] to-[#0B1220] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#0F172A] to-[#0B1220] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-3xl">📄</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {error || "Blog not found"}
          </h1>
          <p className="text-slate-400 mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            ← Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#0F172A] to-[#0B1220]">
      {/* Hero Section */}
      <div className="relative">
        {blog.featuredImage && (
          <div className="absolute inset-0 h-[400px] overflow-hidden">
            <img
              src={withCacheBust(blog.featuredImage, blog._id)}
              alt={blog.title}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/50 via-[#0B1220]/80 to-[#0B1220]" />
          </div>
        )}

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          {/* Back Link */}
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-8"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Blogs
          </Link>

          {/* Category & Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {CATEGORY_LABELS[blog.category] || blog.category}
            </span>
            <span className="text-sm text-slate-500">
              {new Date(blog.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {blog.readingTime && (
              <span className="text-sm text-slate-500">
                {blog.readingTime} min read
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {blog.title}
          </h1>

          {/* Excerpt */}
          {blog.excerpt && (
            <p className="text-xl text-slate-300 leading-relaxed">
              {blog.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Featured Image */}
        {blog.featuredImage && (
          <div className="rounded-2xl overflow-hidden border border-white/10 mb-10">
            <img
              src={withCacheBust(blog.featuredImage, blog._id)}
              alt={blog.title}
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <article
          className="prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white
            prose-code:text-blue-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded
            prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
            prose-blockquote:border-blue-500 prose-blockquote:text-slate-400
            prose-ul:text-slate-300 prose-ol:text-slate-300
            prose-li:marker:text-blue-500"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Related Services */}
        {blog.relatedServices && blog.relatedServices.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              Related Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blog.relatedServices.map((service) => (
                <Link
                  key={service._id}
                  href={`/buy-service?id=${service._id}`}
                  className="group block"
                >
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-blue-500/50 hover:bg-white/[0.04] transition-all duration-300">
                    {/* Service Image */}
                    <div className="aspect-video bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-pink-500/20 relative overflow-hidden">
                      {service.imageUrl ? (
                        <img
                          src={withCacheBust(service.imageUrl, service._id)}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                            <span className="text-xl">✦</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {service.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-400">
                          ${service.price}
                        </span>
                        <span className="text-xs text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                          View →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Ready to Get Started?
          </h3>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Explore our services and find the perfect solution for your needs.
          </p>
          <Link
            href="/buy-service"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Explore opportunities
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
