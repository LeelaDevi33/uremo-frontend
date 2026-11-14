"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

/**
 * PATCH_52A: Screening Editor (Centralized Screening Management)
 */

type ScreeningQuestion = {
  question: string;
  type?:
    | "single"
    | "multi"
    | "multiple_choice"
    | "text"
    | "file_upload"
    | "ranking"
    | "written"
    | "red_team"
    | "fact_check"
    | "coding"
    | "multimodal";
  options: string[];
  correctAnswer?: number | string;
  correctAnswers?: string[];
  responseA?: string;
  responseB?: string;
  imageUrl?: string;
  codeLanguage?: string;
  referenceUrls?: string[];
  minWords?: number;
};

type Screening = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  timeLimit: number;
  passingScore: number;
  active?: boolean;
  questions: ScreeningQuestion[];
  // PATCH_90
  evaluationMode?: "auto" | "hybrid" | "manual";
  passThreshold?: number;
  rubric?: { criteria: string; weight: number; maxScore: number }[];
  autoValidationRules?: {
    minWords?: number;
    maxWords?: number;
    bannedWords?: string[];
    requireJustification?: boolean;
  };
  // PATCH_94
  screeningType?: string;
  minJustificationWords?: number;
  allowRanking?: boolean;
  allowMultiResponseComparison?: boolean;
};

const RLHF_TYPES = [
  "ranking",
  "written",
  "red_team",
  "fact_check",
  "coding",
  "multimodal",
];

type FormQuestion = {
  question: string;
  type:
    | "single"
    | "multi"
    | "ranking"
    | "written"
    | "red_team"
    | "fact_check"
    | "coding"
    | "multimodal";
  options: string[];
  correctAnswerIndexes: number[];
  responseA?: string;
  responseB?: string;
  imageUrl?: string;
  codeLanguage?: string;
  minWords?: number;
};

export default function AdminScreeningEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const screeningId = params?.id as string;

  const allowedCategories = [
    "microjobs",
    "writing",
    "teaching",
    "coding_math",
    "outlier",
    "other",
  ];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "microjobs",
    timeLimit: 30,
    passingScore: 70,
    questions: [] as FormQuestion[],
    // PATCH_90
    evaluationMode: "hybrid" as "auto" | "hybrid" | "manual",
    passThreshold: 70,
    rubric: [] as { criteria: string; weight: number; maxScore: number }[],
    autoValidationRules: {
      minWords: 0,
      maxWords: 0,
      bannedWords: "",
      requireJustification: false,
    },
    // PATCH_94
    screeningType: "mcq" as string,
    minJustificationWords: 30,
    allowRanking: true,
    allowMultiResponseComparison: false,
  });

  const normalizeOptions = (options: string[]) =>
    options.map((o) => o.trim()).filter(Boolean);

  const loadScreening = async () => {
    if (!screeningId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/api/admin/workspace/screenings/${screeningId}`,
        "GET",
        null,
        true,
      );
      const data: Screening = res.screening;
      setScreening(data);

      const questions: FormQuestion[] = (data.questions || []).map((q) => {
        const options = Array.isArray(q.options) ? q.options : [];
        const qType = RLHF_TYPES.includes(q.type || "")
          ? (q.type as FormQuestion["type"])
          : q.type === "multi"
            ? "multi"
            : "single";
        const correctAnswers = Array.isArray(q.correctAnswers)
          ? q.correctAnswers
          : q.correctAnswer !== undefined && q.correctAnswer !== null
            ? [String(q.correctAnswer)]
            : [];

        let correctAnswerIndexes: number[] = [];

        if (typeof q.correctAnswer === "number") {
          correctAnswerIndexes = [q.correctAnswer];
        } else if (correctAnswers.length > 0) {
          correctAnswerIndexes = correctAnswers
            .map((ans) => options.findIndex((opt) => opt === ans))
            .filter((idx) => idx >= 0);
        }

        if (qType === "single" && correctAnswerIndexes.length > 1) {
          correctAnswerIndexes = [correctAnswerIndexes[0]];
        }

        return {
          question: q.question || "",
          type: qType,
          options: options.length
            ? options
            : RLHF_TYPES.includes(qType)
              ? []
              : ["", "", "", ""],
          correctAnswerIndexes: correctAnswerIndexes.length
            ? correctAnswerIndexes
            : RLHF_TYPES.includes(qType)
              ? []
              : [0],
          ...(q.responseA && { responseA: q.responseA }),
          ...(q.responseB && { responseB: q.responseB }),
          ...(q.imageUrl && { imageUrl: q.imageUrl }),
          ...(q.codeLanguage && { codeLanguage: q.codeLanguage }),
          ...(q.minWords && { minWords: q.minWords }),
        };
      });

      const normalizedCategory = allowedCategories.includes(data.category)
        ? data.category
        : "other";

      setForm({
        title: data.title || "",
        description: data.description || "",
        category: normalizedCategory || "microjobs",
        timeLimit: data.timeLimit || 30,
        passingScore: data.passingScore || 70,
        questions: questions.length
          ? questions
          : [
              {
                question: "",
                type: "single",
                options: ["", "", "", ""],
                correctAnswerIndexes: [0],
              },
            ],
        // PATCH_90
        evaluationMode: data.evaluationMode || "hybrid",
        passThreshold: data.passThreshold || 70,
        rubric: (data.rubric || []).map((r) => ({
          criteria: r.criteria || "",
          weight: r.weight || 1,
          maxScore: r.maxScore || 10,
        })),
        autoValidationRules: {
          minWords: data.autoValidationRules?.minWords || 0,
          maxWords: data.autoValidationRules?.maxWords || 0,
          bannedWords: (data.autoValidationRules?.bannedWords || []).join(", "),
          requireJustification:
            data.autoValidationRules?.requireJustification || false,
        },
        // PATCH_94
        screeningType: data.screeningType || "mcq",
        minJustificationWords: data.minJustificationWords ?? 30,
        allowRanking: data.allowRanking ?? true,
        allowMultiResponseComparison:
          data.allowMultiResponseComparison ?? false,
      });
    } catch (e: any) {
      toast(e?.message || "Failed to load screening", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScreening();
  }, [screeningId]);

  const updateQuestion = (
    index: number,
    field: string,
    value: string | number | string[] | number[],
  ) => {
    const updated = [...form.questions];
    updated[index] = { ...updated[index], [field]: value } as FormQuestion;
    setForm({ ...form, questions: updated });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...form.questions];
    updated[qIndex].options[oIndex] = value;
    setForm({ ...form, questions: updated });
  };

  const toggleCorrectAnswer = (qIndex: number, oIndex: number) => {
    const updated = [...form.questions];
    const q = updated[qIndex];
    if (q.type === "single") {
      q.correctAnswerIndexes = [oIndex];
    } else {
      if (q.correctAnswerIndexes.includes(oIndex)) {
        q.correctAnswerIndexes = q.correctAnswerIndexes.filter(
          (idx) => idx !== oIndex,
        );
      } else {
        q.correctAnswerIndexes = [...q.correctAnswerIndexes, oIndex];
      }
    }
    setForm({ ...form, questions: updated });
  };

  const addQuestion = () => {
    setForm({
      ...form,
      questions: [
        ...form.questions,
        {
          question: "",
          type: "single",
          options: ["", "", "", ""],
          correctAnswerIndexes: [0],
        },
      ],
    });
  };

  const removeQuestion = (index: number) => {
    if (form.questions.length <= 1) return;
    setForm({
      ...form,
      questions: form.questions.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast("Title is required", "error");
      return;
    }

    for (const q of form.questions) {
      if (!q.question.trim()) {
        toast("Each question must have text", "error");
        return;
      }
      // PATCH_94: RLHF types skip option validation
      if (RLHF_TYPES.includes(q.type)) continue;
      const options = normalizeOptions(q.options);
      if (options.length < 2) {
        toast("Each MCQ question must have at least 2 options", "error");
        return;
      }
      const correctAnswers = q.correctAnswerIndexes
        .filter((idx) => options[idx])
        .map((idx) => options[idx]);
      if (correctAnswers.length === 0) {
        toast("Each question must have at least one correct answer", "error");
        return;
      }
      if (q.type === "single" && correctAnswers.length !== 1) {
        toast(
          "Single-choice questions must have exactly one correct answer",
          "error",
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        timeLimit: form.timeLimit,
        passingScore: form.passingScore,
        // PATCH_90: Hybrid screening fields
        evaluationMode: form.evaluationMode,
        passThreshold: form.passThreshold,
        rubric: form.rubric.filter((r) => r.criteria.trim()),
        autoValidationRules: {
          minWords: form.autoValidationRules.minWords || undefined,
          maxWords: form.autoValidationRules.maxWords || undefined,
          bannedWords: form.autoValidationRules.bannedWords
            ? form.autoValidationRules.bannedWords
                .split(",")
                .map((w: string) => w.trim())
                .filter(Boolean)
            : undefined,
          requireJustification:
            form.autoValidationRules.requireJustification || undefined,
        },
        // PATCH_94: RLHF screening-level fields
        screeningType: form.screeningType,
        minJustificationWords: form.minJustificationWords,
        allowRanking: form.allowRanking,
        allowMultiResponseComparison: form.allowMultiResponseComparison,
        questions: form.questions.map((q) => {
          const options = normalizeOptions(q.options);
          const correctAnswers = q.correctAnswerIndexes
            .filter((idx) => options[idx])
            .map((idx) => options[idx]);
          return {
            question: q.question.trim(),
            type: q.type,
            options,
            correctAnswers,
            // PATCH_94: RLHF question-level fields
            ...(q.responseA && { responseA: q.responseA }),
            ...(q.responseB && { responseB: q.responseB }),
            ...(q.imageUrl && { imageUrl: q.imageUrl }),
            ...(q.codeLanguage && { codeLanguage: q.codeLanguage }),
            ...(q.minWords && { minWords: q.minWords }),
          };
        }),
      };

      await apiRequest(
        `/api/admin/workspace/screenings/${screeningId}`,
        "PUT",
        payload,
        true,
      );
      toast("Screening updated", "success");
      router.push("/admin/workspace/screenings");
    } catch (e: any) {
      toast(e?.message || "Failed to update screening", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="u-container max-w-6xl">
        <div className="card animate-pulse">
          <div className="h-12 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="u-container max-w-6xl">
        <div className="card text-center py-10">
          <p className="text-slate-400">Screening not found</p>
          <Link
            href="/admin/workspace/screenings"
            className="btn-secondary mt-4 inline-block"
          >
            Back to Screenings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="u-container max-w-6xl">
      <div className="mb-6">
        <Link
          href="/admin/workspace/screenings"
          className="text-sm text-slate-400 hover:text-white mb-2 inline-block"
        >
          ← Back to Screenings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Screening</h1>
            <p className="text-sm text-slate-400">{screening.title}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Title</label>
            <input
              type="text"
              aria-label="Screening title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Category
            </label>
            <select
              aria-label="Screening category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input w-full"
            >
              <option value="microjobs">Microjobs</option>
              <option value="writing">Writing</option>
              <option value="teaching">Teaching</option>
              <option value="coding_math">Coding & Math</option>
              <option value="outlier">Outlier</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block">
              Description
            </label>
            <textarea
              aria-label="Screening description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="input w-full h-20 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Time Limit (min)
            </label>
            <input
              type="number"
              min={1}
              aria-label="Time limit in minutes"
              value={form.timeLimit}
              onChange={(e) =>
                setForm({ ...form, timeLimit: Number(e.target.value) })
              }
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Passing Score (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              aria-label="Passing score percent"
              value={form.passingScore}
              onChange={(e) =>
                setForm({ ...form, passingScore: Number(e.target.value) })
              }
              className="input w-full"
            />
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Questions</h3>
            <button
              type="button"
              onClick={addQuestion}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Add Question
            </button>
          </div>

          {/* PATCH_90: Evaluation Mode & Rubric Settings */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <h3 className="font-medium text-sm text-slate-300 mb-3">
              ⚡ Evaluation Settings{" "}
              <span className="text-xs text-slate-500">(PATCH_90)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Evaluation Mode
                </label>
                <select
                  aria-label="Evaluation mode"
                  value={form.evaluationMode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      evaluationMode: e.target.value as
                        | "auto"
                        | "hybrid"
                        | "manual",
                    })
                  }
                  className="input w-full"
                >
                  <option value="auto">
                    Auto (MCQ only, instant pass/fail)
                  </option>
                  <option value="hybrid">
                    Hybrid (auto score + admin review)
                  </option>
                  <option value="manual">Manual (full admin review)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Pass Threshold (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  aria-label="Pass threshold percent"
                  value={form.passThreshold}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      passThreshold: Number(e.target.value) || 70,
                    })
                  }
                  className="input w-full"
                />
              </div>
            </div>

            {/* Auto Validation Rules */}
            {form.evaluationMode !== "auto" && (
              <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-xs font-medium text-slate-400 mb-2">
                  Auto Validation Rules
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Min Words
                    </label>
                    <input
                      type="number"
                      min={0}
                      aria-label="Minimum response length in words"
                      value={form.autoValidationRules.minWords}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          autoValidationRules: {
                            ...form.autoValidationRules,
                            minWords: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="input w-full text-sm"
                      placeholder="0 = no limit"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Max Words
                    </label>
                    <input
                      type="number"
                      min={0}
                      aria-label="Maximum response length in words"
                      value={form.autoValidationRules.maxWords}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          autoValidationRules: {
                            ...form.autoValidationRules,
                            maxWords: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="input w-full text-sm"
                      placeholder="0 = no limit"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">
                      Banned Words (comma separated)
                    </label>
                    <input
                      type="text"
                      aria-label="Banned words"
                      value={form.autoValidationRules.bannedWords}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          autoValidationRules: {
                            ...form.autoValidationRules,
                            bannedWords: e.target.value,
                          },
                        })
                      }
                      className="input w-full text-sm"
                      placeholder="e.g., spam, placeholder, lorem"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.autoValidationRules.requireJustification}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            autoValidationRules: {
                              ...form.autoValidationRules,
                              requireJustification: e.target.checked,
                            },
                          })
                        }
                      />
                      Require justification in text answers
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Rubric Editor */}
            {form.evaluationMode !== "auto" && (
              <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-slate-400">
                    Rubric Criteria
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        rubric: [
                          ...form.rubric,
                          { criteria: "", weight: 1, maxScore: 10 },
                        ],
                      })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    + Add Criteria
                  </button>
                </div>
                {form.rubric.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No rubric criteria. Admin will review without structured
                    rubric.
                  </p>
                )}
                <div className="space-y-2">
                  {form.rubric.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        aria-label={`Rubric criterion ${idx + 1}`}
                        value={r.criteria}
                        onChange={(e) => {
                          const updated = [...form.rubric];
                          updated[idx] = {
                            ...updated[idx],
                            criteria: e.target.value,
                          };
                          setForm({ ...form, rubric: updated });
                        }}
                        className="input flex-1 text-sm"
                        placeholder="Criteria name"
                      />
                      <input
                        type="number"
                        min={1}
                        aria-label={`Criterion weight ${idx + 1}`}
                        value={r.weight}
                        onChange={(e) => {
                          const updated = [...form.rubric];
                          updated[idx] = {
                            ...updated[idx],
                            weight: Number(e.target.value) || 1,
                          };
                          setForm({ ...form, rubric: updated });
                        }}
                        className="input w-16 text-sm"
                        placeholder="Wt"
                        title="Weight"
                      />
                      <input
                        type="number"
                        min={1}
                        aria-label={`Criterion maximum score ${idx + 1}`}
                        value={r.maxScore}
                        onChange={(e) => {
                          const updated = [...form.rubric];
                          updated[idx] = {
                            ...updated[idx],
                            maxScore: Number(e.target.value) || 10,
                          };
                          setForm({ ...form, rubric: updated });
                        }}
                        className="input w-16 text-sm"
                        placeholder="Max"
                        title="Max Score"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            rubric: form.rubric.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {form.questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs text-slate-500 shrink-0">
                    Q{qIndex + 1}
                  </span>
                  {form.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  <input
                    type="text"
                    aria-label={`Question ${qIndex + 1}, question text`}
                    value={q.question}
                    onChange={(e) =>
                      updateQuestion(qIndex, "question", e.target.value)
                    }
                    className="input w-full md:col-span-2"
                    placeholder="Enter question..."
                  />
                  <select
                    aria-label={`Question ${qIndex + 1}, question type`}
                    value={q.type}
                    onChange={(e) => {
                      const nextType = e.target.value as FormQuestion["type"];
                      const updated = [...form.questions];
                      updated[qIndex] = { ...updated[qIndex], type: nextType };
                      if (
                        nextType === "single" &&
                        updated[qIndex].correctAnswerIndexes.length > 1
                      ) {
                        updated[qIndex].correctAnswerIndexes = [
                          updated[qIndex].correctAnswerIndexes[0],
                        ];
                      }
                      setForm({ ...form, questions: updated });
                    }}
                    className="input w-full"
                  >
                    <option value="single">Single Correct</option>
                    <option value="multi">Multi Correct</option>
                    {form.screeningType !== "mcq" && (
                      <>
                        <option value="ranking">🔀 Ranking</option>
                        <option value="written">✍️ Written</option>
                        <option value="red_team">🛡️ Red Team</option>
                        <option value="fact_check">📋 Fact Check</option>
                        <option value="coding">💻 Coding</option>
                        <option value="multimodal">🖼️ Multimodal</option>
                      </>
                    )}
                  </select>
                </div>

                {/* MCQ Options (single/multi types only) */}
                {(q.type === "single" || q.type === "multi") && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          {q.type === "single" ? (
                            <input
                              type="radio"
                              aria-label={`Mark option ${oIndex + 1} correct for question ${qIndex + 1}`}
                              name={`correct-${qIndex}`}
                              checked={q.correctAnswerIndexes.includes(oIndex)}
                              onChange={() =>
                                toggleCorrectAnswer(qIndex, oIndex)
                              }
                              className="shrink-0"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={q.correctAnswerIndexes.includes(oIndex)}
                              onChange={() =>
                                toggleCorrectAnswer(qIndex, oIndex)
                              }
                              className="shrink-0"
                            />
                          )}
                          <input
                            type="text"
                            aria-label={`Question ${qIndex + 1}, option ${oIndex + 1}`}
                            value={opt}
                            onChange={(e) =>
                              updateOption(qIndex, oIndex, e.target.value)
                            }
                            className="input w-full text-sm"
                            placeholder={`Option ${oIndex + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {q.type === "single"
                        ? "Select the radio for the correct answer"
                        : "Select all correct answers"}
                    </p>
                  </>
                )}

                {/* PATCH_94: RLHF Question Fields for Editor */}
                {q.type === "ranking" && (
                  <div className="mt-3 space-y-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <p className="text-xs font-medium text-purple-300">
                      🔀 Ranking — Response Comparison
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Response A
                        </label>
                        <textarea
                          aria-label={`Question ${qIndex + 1}, response a`}
                          value={q.responseA || ""}
                          onChange={(e) =>
                            updateQuestion(qIndex, "responseA", e.target.value)
                          }
                          className="input w-full text-sm h-20 resize-none"
                          placeholder="Response A..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Response B
                        </label>
                        <textarea
                          aria-label={`Question ${qIndex + 1}, response b`}
                          value={q.responseB || ""}
                          onChange={(e) =>
                            updateQuestion(qIndex, "responseB", e.target.value)
                          }
                          className="input w-full text-sm h-20 resize-none"
                          placeholder="Response B..."
                        />
                      </div>
                    </div>
                  </div>
                )}
                {q.type === "written" && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs font-medium text-blue-300">
                      ✍️ Written — Free-form Response
                    </p>
                    <div className="mt-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        Min Words
                      </label>
                      <input
                        type="number"
                        min="0"
                        aria-label={`Question ${qIndex + 1}, minimum words`}
                        value={q.minWords || 0}
                        onChange={(e) =>
                          updateQuestion(
                            qIndex,
                            "minWords",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="input w-24 text-sm"
                      />
                    </div>
                  </div>
                )}
                {q.type === "coding" && (
                  <div className="mt-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                    <p className="text-xs font-medium text-cyan-300">
                      💻 Coding — Code Solution
                    </p>
                    <div className="mt-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        Language
                      </label>
                      <select
                        aria-label={`Question ${qIndex + 1}, code language`}
                        value={q.codeLanguage || "javascript"}
                        onChange={(e) =>
                          updateQuestion(qIndex, "codeLanguage", e.target.value)
                        }
                        className="input w-40 text-sm"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="typescript">TypeScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
                {q.type === "multimodal" && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs font-medium text-amber-300">
                      🖼️ Multimodal — Image Analysis
                    </p>
                    <div className="mt-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        Image URL
                      </label>
                      <input
                        type="url"
                        aria-label={`Question ${qIndex + 1}, image url`}
                        value={q.imageUrl || ""}
                        onChange={(e) =>
                          updateQuestion(qIndex, "imageUrl", e.target.value)
                        }
                        className="input w-full text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt="Preview"
                        className="max-h-24 rounded border border-white/10 mt-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                )}
                {q.type === "fact_check" && (
                  <div className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-xs font-medium text-green-300">
                      📋 Fact Check — Worker provides verdict + sources
                    </p>
                  </div>
                )}
                {q.type === "red_team" && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-xs font-medium text-red-300">
                      🛡️ Red Team — Worker writes adversarial prompt +
                      explanation
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
