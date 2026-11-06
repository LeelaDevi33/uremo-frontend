"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { withCacheBust } from "@/lib/cacheBust";

// PATCH_62: Blog category labels aligned with backend
const CATEGORY_LABELS: Record<string, string> = {
  opportunities: "Project opportunities",
  microjobs: "Work and gigs",
  guides: "Guides",
  general: "General",
};

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category: string;
  featuredImage?: string;
  createdAt: string;
  readingTime?: number;
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (search.trim()) params.set("search", search.trim());

      const res = await apiRequest(`/api/blogs?${params.toString()}`);
      if (res?.ok) {
        setBlogs(res.blogs || []);
        setCategories(res.filters?.categories || []);
      }
    } catch (err) {
      console.error("Failed to load blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBlogs();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#0F172A] to-[#0B1220]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <span role="img" aria-label="blogs">
              📝
            </span>{" "}
            UREMO Blog
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Guides and updates from the UREMO team.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 pl-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat}
              </option>
            ))}
          </select>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-3xl">Blog</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No articles found
            </h3>
            <p className="text-slate-400">
              {search
                ? "Try a different search term"
                : "Check back soon for new content!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <Link
                key={blog._id}
                href={`/blogs/${blog.slug}`}
                className="group block"
              >
                <article className="h-full rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-blue-500/50 hover:bg-white/[0.04] transition-all duration-300">
                  {/* Image */}
                  <div className="aspect-video bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-pink-500/20 relative overflow-hidden">
                    {blog.featuredImage ? (
                      <img
                        src={withCacheBust(blog.featuredImage, blog._id)}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                          <span className="text-2xl">✦</span>
                        </div>
                      </div>
                    )}
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/80 text-white backdrop-blur-sm">
                        {CATEGORY_LABELS[blog.category] || blog.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                      {blog.title}
                    </h2>
                    {blog.excerpt && (
                      <p className="text-sm text-slate-400 line-clamp-3 mb-4">
                        {blog.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {new Date(blog.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {blog.readingTime && (
                        <span>{blog.readingTime} min read</span>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
