"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { apiRequest, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") return false;
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type ServiceRequestStatus =
  | "draft"
  | "new"
  | "contacted"
  | "in_progress"
  | "converted"
  | "closed"
  | "cancelled";

type ServiceRequestSource = "jarvisx" | "public";

interface ServiceRequest {
  _id: string;
  userId?: string;
  name?: string;
  email?: string;
  source: ServiceRequestSource;
  rawMessage?: string;
  requestedService?: string;
  platform?: string;
  country?: string;
  urgency?: string;
  budget?: number | null;
  budgetCurrency?: string;
  notes?: string;
  status: ServiceRequestStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  items: ServiceRequest[];
  total: number;
  page: number;
  limit: number;
}

function statusBadgeClass(status: ServiceRequestStatus) {
  const base = "text-xs px-2 py-1 rounded border";
  switch (status) {
    case "new":
      return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-500/20`;
    case "contacted":
      return `${base} bg-sky-500/10 text-sky-300 border-sky-500/20`;
    case "in_progress":
      return `${base} bg-amber-500/10 text-amber-300 border-amber-500/20`;
    case "converted":
      return `${base} bg-purple-500/10 text-purple-300 border-purple-500/20`;
    case "closed":
      return `${base} bg-slate-500/10 text-slate-300 border-slate-500/20`;
    case "cancelled":
      return `${base} bg-rose-500/10 text-rose-300 border-rose-500/20`;
    case "draft":
    default:
      return `${base} bg-white/5 text-slate-300 border-white/10`;
  }
}

export default function AdminServiceRequestsPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("new");
  const [source, setSource] = useState<string>("all");

  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [saving, setSaving] = useState(false);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    if (source) p.set("source", source);
    p.set("limit", "100");
    p.set("page", "1");
    return p.toString();
  }, [q, status, source]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<ListResponse>(
        `/api/admin/service-requests?${queryParams}`,
        "GET",
        null,
        true
      );
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      toast("Failed to load service requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const refreshSelected = async (id: string) => {
    try {
      const data = await apiRequest<ServiceRequest>(
        `/api/admin/service-requests/${id}`,
        "GET",
        null,
        true
      );
      setSelected(data);
    } catch (err) {
      console.error(err);
      // If it was deleted, close drawer
      const apiErr = err as ApiError;
      if (apiErr?.status === 404) setSelected(null);
    }
  };

  const updateSelected = async (patch: Partial<ServiceRequest>) => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(
        `/api/admin/service-requests/${selected._id}`,
        "PUT",
        patch,
        true
      );
      await Promise.all([load(), refreshSelected(selected._id)]);
      toast("Updated", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to update", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const ok = confirm("Delete this service request? This cannot be undone.");
    if (!ok) return;

    setSaving(true);
    try {
      await apiRequest(
        `/api/admin/service-requests/${selected._id}`,
        "DELETE",
        null,
        true
      );
      toast("Deleted", "success");
      setSelected(null);
      load();
    } catch (err) {
      console.error(err);
      toast("Failed to delete", "error");
    } finally {
      setSaving(false);
    }
  };

  const buildRequestClipboardText = (r: ServiceRequest) => {
    const lines = [
      `Service: ${r.requestedService || ""}`.trim(),
      `Platform: ${r.platform || ""}`.trim(),
      `Country: ${r.country || ""}`.trim(),
      `Urgency: ${r.urgency || ""}`.trim(),
      `Budget: ${
        r.budget == null ? "" : `${r.budgetCurrency || "USD"} ${r.budget}`
      }`.trim(),
      `Contact: ${[r.email, r.name].filter(Boolean).join(" — ")}`.trim(),
      `Message:`.trim(),
      String(r.rawMessage || "").trim(),
    ].filter(Boolean);
    return lines.join("\n");
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin — Service Requests</h1>
          <p className="text-sm text-slate-400">
            Leads created from JarvisX Support and public requests.
          </p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="u-input placeholder:text-slate-400"
            placeholder="Search (service, platform, email, country…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="u-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="in_progress">In Progress</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
            <option value="draft">Draft</option>
          </select>

          <select
            className="u-select"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="all">All sources</option>
            <option value="jarvisx">JarvisX</option>
            <option value="public">Public</option>
          </select>
        </div>
      </Card>

      <Card title={`Requests (${total})`}>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">
            {loading ? "Loading…" : "No service requests found."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-300">
                  <th className="p-2">Created</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Service</th>
                  <th className="p-2">Platform</th>
                  <th className="p-2">Country</th>
                  <th className="p-2">Contact</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r._id} className="border-b border-white/10">
                    <td className="p-2 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <span className={statusBadgeClass(r.status)}>
                        {r.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="p-2 font-medium text-white">
                      {r.requestedService || "—"}
                    </td>
                    <td className="p-2">{r.platform || "—"}</td>
                    <td className="p-2">{r.country || "—"}</td>
                    <td className="p-2 text-xs text-slate-400">
                      <div className="max-w-[260px] truncate">
                        {r.email || r.name || "—"}
                      </div>
                    </td>
                    <td className="p-2 capitalize text-slate-300">
                      {r.source}
                    </td>
                    <td className="p-2">
                      <button
                        className="btn-secondary"
                        onClick={() => setSelected(r)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Drawer */}
      <div
        className={`fixed inset-0 z-[10000] ${
          selected ? "" : "pointer-events-none"
        }`}
        aria-hidden={!selected}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
            selected ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSelected(null)}
        />

        <div
          className={`absolute right-0 top-0 h-full w-[520px] max-w-[92vw] bg-slate-900 border-l border-white/10 shadow-2xl transform transition-transform ${
            selected ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Request</p>
              <p className="text-sm font-semibold text-white truncate">
                {selected?._id}
              </p>
            </div>
            <button className="btn-secondary" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-3.5rem)]">
            {selected && (
              <>
                <Card title="Summary">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Status</span>
                      <span className={statusBadgeClass(selected.status)}>
                        {selected.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Service</span>
                      <span className="text-white">
                        {selected.requestedService || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Platform</span>
                      <span className="text-white">
                        {selected.platform || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Country</span>
                      <span className="text-white">
                        {selected.country || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Urgency</span>
                      <span className="text-white">
                        {selected.urgency || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Budget</span>
                      <span className="text-white">
                        {selected.budget == null
                          ? "—"
                          : `${selected.budgetCurrency || "USD"} ${
                              selected.budget
                            }`}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <p className="text-slate-400">Contact</p>
                      <p className="text-white">
                        {selected.email || ""}
                        {selected.email && selected.name ? " — " : ""}
                        {selected.name || ""}
                        {!selected.email && !selected.name ? "—" : ""}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card title="Raw Message">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {selected.rawMessage || "—"}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <button
                      className="btn-secondary"
                      onClick={async () => {
                        const ok = await copyToClipboard(
                          buildRequestClipboardText(selected)
                        );
                        toast(
                          ok
                            ? "Copied request to clipboard"
                            : "Copy failed (browser permission)"
                        );
                      }}
                    >
                      Copy
                    </button>

                    <a
                      className="btn-secondary"
                      href="/admin/opportunities"
                    >
                      Manage opportunities
                    </a>
                  </div>
                </Card>

                <Card title="Notes">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">
                    {selected.notes || "—"}
                  </p>
                </Card>

                <Card title="Admin Notes">
                  <textarea
                    className="u-textarea placeholder:text-slate-400"
                    rows={4}
                    value={selected.adminNotes || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, adminNotes: e.target.value })
                    }
                    placeholder="Internal notes…"
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      className="btn-primary"
                      disabled={saving}
                      onClick={() =>
                        updateSelected({
                          adminNotes: selected.adminNotes || "",
                        })
                      }
                    >
                      {saving ? "Saving…" : "Save Notes"}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={saving}
                      onClick={deleteSelected}
                    >
                      Delete
                    </button>
                  </div>
                </Card>

                <Card title="Status Actions">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        "new",
                        "contacted",
                        "in_progress",
                        "converted",
                        "closed",
                        "cancelled",
                      ] as ServiceRequestStatus[]
                    ).map((s) => (
                      <button
                        key={s}
                        className="btn-secondary"
                        disabled={saving || selected.status === s}
                        onClick={() => updateSelected({ status: s })}
                      >
                        Mark {s.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
