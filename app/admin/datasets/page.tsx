"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import ConfirmModal from "@/components/admin/v2/ConfirmModal";

// ── Types ───────────────────────────────────────
interface Dataset {
  _id: string;
  name: string;
  description: string;
  datasetType: string;
  difficultyLevel: string;
  minJustificationWords: number;
  minWordCount: number;
  allowMultiResponseComparison: boolean;
  isActive: boolean;
  taskCount?: number;
  submissionCount?: number;
  createdBy?: { name: string; email: string };
  createdAt: string;
}

const DATASET_TYPES = [
  { value: "ranking", label: "Ranking" },
  { value: "generation", label: "Generation" },
  { value: "red_team", label: "Red Team" },
  { value: "fact_check", label: "Fact Check" },
  { value: "coding", label: "Coding" },
  { value: "multimodal", label: "Multimodal" },
];

const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

// ── Main Content ────────────────────────────────
function DatasetsContent() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("ranking");
  const [formDifficulty, setFormDifficulty] = useState("intermediate");
  const [formMinJust, setFormMinJust] = useState(30);
  const [formMinWords, setFormMinWords] = useState(0);
  const [formMultiResp, setFormMultiResp] = useState(false);
  const [creating, setCreating] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(
        "/api/admin/datasets",
        "GET",
        null,
        true,
      );
      setDatasets(res.datasets || []);
    } catch (e: any) {
      setError(e.message || "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) return setError("Name is required");
    setCreating(true);
    setError(null);
    try {
      await apiRequest(
        "/api/admin/datasets",
        "POST",
        {
          name: formName.trim(),
          description: formDesc,
          datasetType: formType,
          difficultyLevel: formDifficulty,
          minJustificationWords: formMinJust,
          minWordCount: formMinWords,
          allowMultiResponseComparison: formMultiResp,
        },
        true,
      );
      setSuccess("Dataset created");
      setShowCreate(false);
      setFormName("");
      setFormDesc("");
      setFormType("ranking");
      setFormDifficulty("intermediate");
      setFormMinJust(30);
      setFormMinWords(0);
      setFormMultiResp(false);
      await loadDatasets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (ds: Dataset) => {
    try {
      await apiRequest(
        `/api/admin/datasets/${ds._id}`,
        "PUT",
        { isActive: !ds.isActive },
        true,
      );
      setSuccess(`Dataset ${ds.isActive ? "deactivated" : "activated"}`);
      await loadDatasets();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(
        `/api/admin/datasets/${deleteTarget._id}`,
        "DELETE",
        null,
        true,
      );
      setSuccess("Dataset deleted");
      setDeleteTarget(null);
      await loadDatasets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ranking: "bg-blue-500/20 text-blue-400",
      generation: "bg-green-500/20 text-green-400",
      red_team: "bg-red-500/20 text-red-400",
      fact_check: "bg-yellow-500/20 text-yellow-400",
      coding: "bg-purple-500/20 text-purple-400",
      multimodal: "bg-pink-500/20 text-pink-400",
    };
    return colors[type] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">RLHF Datasets</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage reusable RLHF datasets for worker annotation projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
        >
          {showCreate ? "Cancel" : "+ New Dataset"}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg">
          {success}
          <button className="ml-2 underline" onClick={() => setSuccess(null)}>
            dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Create New Dataset
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2a3a] border border-[#3a3a4a] rounded-lg text-white text-sm"
                placeholder="e.g., GPT-4 Response Ranking"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Dataset Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2a3a] border border-[#3a3a4a] rounded-lg text-white text-sm"
              >
                {DATASET_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">
                Description
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-[#2a2a3a] border border-[#3a3a4a] rounded-lg text-white text-sm"
                placeholder="Brief description of what annotators will evaluate..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Difficulty Level
              </label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2a3a] border border-[#3a3a4a] rounded-lg text-white text-sm"
              >
                {DIFFICULTY_LEVELS.map((dl) => (
                  <option key={dl.value} value={dl.value}>
                    {dl.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Min Justification Words
              </label>
              <input
                type="number"
                value={formMinJust}
                onChange={(e) => setFormMinJust(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#2a2a3a] border border-[#3a3a4a] rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Min Word Count
              </label>
              <input
                type="number"
                value={formMinWords}
                onChange={(e) => setFormMinWords(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#2a2a3a] border border-[#3a3a4a] rounded-lg text-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formMultiResp}
                onChange={(e) => setFormMultiResp(e.target.checked)}
                className="rounded"
              />
              <label className="text-sm text-gray-400">
                Allow Multi-Response Comparison
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition"
            >
              {creating ? "Creating..." : "Create Dataset"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dataset List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          Loading datasets...
        </div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No datasets yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first RLHF dataset to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {datasets.map((ds) => (
            <div
              key={ds._id}
              className="bg-[#1e1e2e] border border-[#2a2a3a] rounded-xl p-5 hover:border-[#3a3a4a] transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/admin/datasets/${ds._id}`}
                      className="text-lg font-semibold text-white hover:text-blue-400 transition"
                    >
                      {ds.name}
                    </Link>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeBadge(ds.datasetType)}`}
                    >
                      {ds.datasetType.replace("_", " ")}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        ds.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {ds.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {ds.description && (
                    <p className="text-sm text-gray-400 mb-2">
                      {ds.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>{ds.taskCount || 0} tasks</span>
                    <span>{ds.submissionCount || 0} submissions</span>
                    <span>{ds.difficultyLevel}</span>
                    <span>
                      Min {ds.minJustificationWords} justification words
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/admin/datasets/${ds._id}`}
                    className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition"
                  >
                    Edit & Tasks
                  </Link>
                  <button
                    onClick={() => handleToggleActive(ds)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition ${
                      ds.isActive
                        ? "bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30"
                        : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                    }`}
                  >
                    {ds.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(ds)}
                    className="px-3 py-1.5 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          title="Delete Dataset"
          description={`Delete "${deleteTarget.name}" and all its tasks? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
          variant="danger"
        />
      )}
    </div>
  );
}

export default function DatasetsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <DatasetsContent />
    </Suspense>
  );
}
