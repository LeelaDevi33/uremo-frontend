"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import FilePreview from "@/components/FilePreview";

/**
 * PATCH_55: Fixed interface to match backend ApplyWork model
 * - position: can be object (populated) or undefined
 * - positionTitle: string stored separately
 * - resumeUrl: optional with fallback UI
 */
interface Application {
  _id: string;
  user: { _id?: string; email: string; name?: string } | null;
  position?: {
    _id: string;
    title: string;
    category?: string;
    active?: boolean;
  } | null;
  positionTitle?: string;
  category?: string;
  message?: string;
  resumeUrl?: string;
  resumeOriginalName?: string;
  resumeMimeType?: string;
  resumeResourceType?: string;
  status: "pending" | "approved" | "rejected";
  workerStatus?: string;
  createdAt: string;
}

interface FilterOptions {
  statuses: string[];
  categories: { value: string; label: string }[] | string[];
}

const statusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-800";
    case "approved":
      return "bg-green-800";
    case "rejected":
      return "bg-red-800";
    default:
      return "bg-gray-600";
  }
};

export default function AdminApplicationsPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    statuses: ["pending", "approved", "rejected"],
    categories: [],
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "20");

      const data = await apiRequest<any>(
        `/api/apply-work/admin?${params.toString()}`,
        "GET",
        null,
        true,
      );

      if (Array.isArray(data)) {
        setApplications(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setApplications(data.applications || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 1);
        if (data.filterOptions) setFilterOptions(data.filterOptions);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load applications", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      await apiRequest(
        `/api/apply-work/admin/${id}`,
        "PUT",
        { status: newStatus },
        true,
      );
      loadApplications();
      toast(`Application ${newStatus}`, "success");
    } catch (err) {
      console.error(err);
      toast("Failed to update application", "error");
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadApplications();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Applications</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Review and manage worker applications
          </p>
        </div>
        <span className="text-sm text-[#9CA3AF] bg-white/5 px-3 py-1 rounded-lg">
          {total} total
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          aria-label="Search applications by email"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="u-input w-64"
        />
        <select
          aria-label="Filter applications by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="u-select"
        >
          <option value="">All Statuses</option>
          {filterOptions.statuses.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter applications by category"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="u-select"
        >
          <option value="">All Categories</option>
          {filterOptions.categories.map((c) => {
            const val = typeof c === "string" ? c : c.value;
            const label =
              typeof c === "string" ? c.replace(/_/g, " ") : c.label;
            return (
              <option key={val} value={val}>
                {label}
              </option>
            );
          })}
        </select>
        {(statusFilter || categoryFilter || search) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setCategoryFilter("");
              setSearch("");
              setPage(1);
            }}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Clear
          </button>
        )}
      </div>

      {loading && <p className="text-[#9CA3AF]">Loading applications...</p>}

      {!loading && applications.length === 0 && (
        <div className="card">
          <p className="text-sm text-[#9CA3AF]">No applications found.</p>
        </div>
      )}

      {!loading && applications.length > 0 && (
        <div className="border border-[#1F2937] rounded-lg overflow-hidden bg-[#0F172A]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-[#0B1220] border-b border-white/10">
                  <th className="p-4 text-xs text-[#9CA3AF]">Applicant</th>
                  <th className="p-4 text-xs text-[#9CA3AF]">Job Role</th>
                  <th className="p-4 text-xs text-[#9CA3AF]">Category</th>
                  <th className="p-4 text-xs text-[#9CA3AF]">Applied</th>
                  <th className="p-4 text-xs text-[#9CA3AF]">Resume</th>
                  <th className="p-4 text-xs text-[#9CA3AF]">Status</th>
                  <th className="p-4 text-xs text-[#9CA3AF]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => {
                  // PATCH_55: Properly extract job role title from position object or positionTitle
                  const jobRole =
                    app.position?.title || app.positionTitle || "—";
                  const hasResume = !!app.resumeUrl;

                  return (
                    <tr
                      key={app._id}
                      className={`border-b border-white/10 hover:bg-white/5 ${
                        idx % 2 === 0 ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-white">
                            {app.user?.name || "N/A"}
                          </p>
                          <p className="text-xs text-[#9CA3AF]">
                            {app.user?.email || "Unknown email"}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-[#9CA3AF]">{jobRole}</td>
                      <td className="p-4 text-[#9CA3AF]">
                        {app.category?.replace(/_/g, " ") || "—"}
                      </td>
                      <td className="p-4 text-[#9CA3AF]">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {hasResume ? (
                          <FilePreview
                            url={app.resumeUrl}
                            label="View Resume"
                            type={
                              app.resumeMimeType?.includes("pdf") ||
                              app.resumeResourceType === "raw"
                                ? "raw"
                                : "image"
                            }
                          />
                        ) : (
                          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                            No resume uploaded
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`${statusColor(app.status)} text-white text-xs px-2 py-1 rounded`}
                        >
                          {app.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {app.status !== "approved" && (
                            <button
                              onClick={() => updateStatus(app._id, "approved")}
                              disabled={updating === app._id}
                              className="px-2 py-1 bg-green-800 text-white text-xs rounded hover:bg-green-900 disabled:opacity-50"
                              title="Approve Application"
                            >
                              {updating === app._id ? "..." : "✓ Approve"}
                            </button>
                          )}
                          {app.status !== "rejected" && (
                            <button
                              onClick={() => updateStatus(app._id, "rejected")}
                              disabled={updating === app._id}
                              className="px-2 py-1 bg-red-800 text-white text-xs rounded hover:bg-red-900 disabled:opacity-50"
                              title="Reject Application"
                            >
                              {updating === app._id ? "..." : "✕ Reject"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm bg-[#1F2937] rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-[#9CA3AF]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm bg-[#1F2937] rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
