import sanitizeHtml from "sanitize-html";
import Link from "next/link";
import { withCacheBust } from "@/lib/cacheBust";

// PATCH_21: Category labels for blog display
const CATEGORY_LABELS: Record<string, string> = {
  opportunities: "Project opportunities",
  microjobs: "Work and gigs",
  guides: "Guides",
  general: "General",
};

export interface Blog {
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
}

export default function BlogContent({ blog }: { blog: Blog }) {
  const content = sanitizeHtml(blog.content, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "title", "width", "height"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
  });
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
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Call to Action */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 text-center">
          <Link
            href="/open-roles"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Browse open roles
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
