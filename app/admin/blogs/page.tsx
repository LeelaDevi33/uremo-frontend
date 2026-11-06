"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { withCacheBust } from "@/lib/cacheBust";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiBlogs } from "@/components/ui/Emoji";

// PATCH_21: Blog CMS types
interface RelatedService {
  _id: string;
  title: string;
}

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category: string;
  featuredImage?: string;
  status: "draft" | "published";
  relatedServices: RelatedService[];
  createdAt: string;
  viewCount?: number;
}

const CATEGORY_OPTIONS = [
  { value: "opportunities", label: "Project opportunities" },
  { value: "microjobs", label: "Work and gigs" },
  { value: "guides", label: "Guides" },
  { value: "general", label: "General" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export default function AdminBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "general",
    status: "draft",
  });
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<
    string | null
  >(null);
  const [existingFeaturedImage, setExistingFeaturedImage] = useState<
    string | null
  >(null);
  const [imageCacheBust, setImageCacheBust] = useState<number>(Date.now());

  // Search/filter
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load blog posts independently from the retired service catalogue.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const blogsRes = await apiRequest("/api/admin/blogs", "GET", null, true);
      if (blogsRes?.ok) setBlogs(blogsRes.blogs || []);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      category: "general",
      status: "draft",
    });
    setFeaturedImageFile(null);
    setFeaturedImagePreview(null);
    setExistingFeaturedImage(null);
    setEditingId(null);
    setShowForm(false);
  };

  // Open form for new blog
  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const openEditForm = async (blog: Blog) => {
    setFormData({
      title: blog.title,
      excerpt: blog.excerpt || "",
      content: blog.content,
      category: blog.category,
      status: blog.status,
    });
    setExistingFeaturedImage(blog.featuredImage || null);
    setFeaturedImagePreview(null);
    setFeaturedImageFile(null);
    setEditingId(blog._id);
    setShowForm(true);
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFeaturedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image
  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const data = await apiRequest<{ ok: boolean; url?: string }>(
        "/api/upload/image",
        "POST",
        formData,
        true,
        true,
      );
      if (data.ok && data.url) {
        return data.url;
      }
      return null;
    } catch (err) {
      console.error("Image upload failed:", err);
      return null;
    }
  };

  // Save blog
  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.content.trim()) {
      setError("Content is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Upload image if new one selected
      let featuredImage = existingFeaturedImage;
      if (featuredImageFile) {
        const uploadedUrl = await uploadImage(featuredImageFile);
        if (uploadedUrl) {
          featuredImage = uploadedUrl;
        } else {
          setError("Failed to upload image");
          setSaving(false);
          return;
        }
      }

      const payload = {
        ...formData,
        featuredImage,
      };

      const url = editingId
        ? `/api/admin/blogs/${editingId}`
        : "/api/admin/blogs";
      const method = editingId ? "PUT" : "POST";

      const res = await apiRequest(
        url,
        method as "POST" | "PUT",
        payload,
        true,
      );

      if (res?.ok) {
        setSuccess(
          editingId ? "Blog updated successfully" : "Blog created successfully",
        );
        setImageCacheBust(Date.now());
        resetForm();
        loadData();
      } else {
        setError(res?.error || "Failed to save blog");
      }
    } catch (err) {
      console.error("Save failed:", err);
      setError("Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  // Delete blog
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await apiRequest(
        `/api/admin/blogs/${id}`,
        "DELETE",
        null,
        true,
      );

      if (res?.ok) {
        setSuccess("Blog deleted successfully");
        loadData();
      } else {
        setError(res?.error || "Failed to delete blog");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete blog");
    }
  };

  // Filter blogs
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      !searchTerm ||
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || blog.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" || blog.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <PageHeader
            title="Blog Management"
            emoji={<EmojiBlogs />}
            description="Create and manage blog posts for your content hub"
          />
          <button
            onClick={openNewForm}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Blog Post
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
            {success}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0F172A] rounded-2xl border border-white/10 shadow-2xl">
              <div className="sticky top-0 z-10 bg-[#0F172A] px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingId ? "Edit Blog Post" : "New Blog Post"}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-lg hover:bg-white/10 transition text-slate-400"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    placeholder="Enter blog title..."
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Excerpt
                  </label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, excerpt: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
                    placeholder="Brief description for previews..."
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Content <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, content: e.target.value }))
                    }
                    rows={12}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none font-mono text-sm"
                    placeholder="Write your blog content here (HTML supported)..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    HTML formatting supported: &lt;p&gt;, &lt;h2&gt;,
                    &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;a&gt;, etc.
                  </p>
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, category: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    >
                      {!CATEGORY_OPTIONS.some((opt) => opt.value === formData.category) && (
                        <option value={formData.category}>Archived category</option>
                      )}
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-[#0F172A]"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          status: e.target.value as "draft" | "published",
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-[#0F172A]"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Featured Image */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Featured Image
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-blue-500/50 cursor-pointer transition bg-white/[0.02]">
                        <svg
                          className="w-8 h-8 text-slate-500 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm text-slate-500">
                          Click to upload image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {(featuredImagePreview || existingFeaturedImage) && (
                      <div className="w-40 h-32 rounded-xl overflow-hidden border border-white/10">
                        <img
                          key={imageCacheBust}
                          src={
                            featuredImagePreview ||
                            withCacheBust(
                              existingFeaturedImage || "",
                              imageCacheBust.toString(),
                            )
                          }
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {editingId && <p className="text-xs text-slate-400">Existing legacy service associations are preserved when editing this post.</p>}
              </div>

              {/* Form Actions */}
              <div className="sticky bottom-0 bg-[#0F172A] px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {editingId ? "Update" : "Create"} Blog
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search blogs..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500 outline-none transition"
          >
            <option value="all" className="bg-[#0F172A]">
              All Categories
            </option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-[#0F172A]"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-blue-500 outline-none transition"
          >
            <option value="all" className="bg-[#0F172A]">
              All Status
            </option>
            {STATUS_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-[#0F172A]"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="text-2xl font-bold text-white">{blogs.length}</div>
            <div className="text-sm text-slate-400">Total Posts</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="text-2xl font-bold text-green-400">
              {blogs.filter((b) => b.status === "published").length}
            </div>
            <div className="text-sm text-slate-400">Published</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="text-2xl font-bold text-yellow-400">
              {blogs.filter((b) => b.status === "draft").length}
            </div>
            <div className="text-sm text-slate-400">Drafts</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="text-2xl font-bold text-blue-400">
              {blogs.reduce((acc, b) => acc + (b.viewCount || 0), 0)}
            </div>
            <div className="text-sm text-slate-400">Total Views</div>
          </div>
        </div>

        {/* Blogs Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                    Blog
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBlogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="text-2xl">📝</span>
                      </div>
                      <p className="text-slate-400">No blog posts found</p>
                      <button
                        onClick={openNewForm}
                        className="mt-4 text-blue-400 hover:text-blue-300"
                      >
                        Create your first blog post
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredBlogs.map((blog) => (
                    <tr
                      key={blog._id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {blog.featuredImage ? (
                            <img
                              src={withCacheBust(
                                blog.featuredImage,
                                imageCacheBust.toString(),
                              )}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                              <span className="text-lg">📄</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-medium text-white truncate max-w-[200px] sm:max-w-[300px]">
                              {blog.title}
                            </h3>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">
                              /{blog.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="px-2 py-1 text-xs rounded-full bg-white/5 text-slate-400 border border-white/10">
                          {CATEGORY_OPTIONS.find(
                            (c) => c.value === blog.category,
                          )?.label || blog.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            blog.status === "published"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          }`}
                        >
                          {blog.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-400">
                          {new Date(blog.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/blogs/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white"
                            title="View"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </a>
                          <button
                            onClick={() => openEditForm(blog)}
                            className="p-2 rounded-lg hover:bg-blue-500/20 transition text-slate-400 hover:text-blue-400"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(blog._id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 transition text-slate-400 hover:text-red-400"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
