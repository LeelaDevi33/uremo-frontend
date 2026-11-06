"use client";

import { cloneElement, useEffect, useId, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api";
import OpportunityReceipts from "@/components/admin/OpportunityReceipts";
import {
  editorError,
  listingPayload,
  projectCategories,
  toDraft,
  type Draft,
  type ListingStatus,
  type Opportunity,
  type OpportunityDetail,
  type WorkRole,
} from "./editor";

const endpoint = "/api/admin/opportunities";
const input =
  "mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0a101b] px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none disabled:opacity-60";
const primary =
  "rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50";
const secondary =
  "rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50";
const panel = "rounded-xl border border-slate-700/70 bg-[#101824] p-4 sm:p-6";
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The request failed. Please try again.";
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="text-sm font-medium text-slate-200">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}

function Mode({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-slate-700/70 py-4 first:border-t-0">
      <label className="flex items-center gap-2 font-medium text-white">
        <input
          className="size-4 accent-cyan-300"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>
      {checked && <div className="mt-3">{children}</div>}
    </div>
  );
}

type Edit = { existing?: OpportunityDetail; draft: Draft };
type Revenue = {
  currency: "USD";
  rent: { count: number; total: number };
  buy: { count: number; total: number };
};

export default function AdminOpportunitiesPage() {
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [roles, setRoles] = useState<WorkRole[]>([]);
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [revenueError, setRevenueError] = useState(false);

  useEffect(() => {
    let current = true;
    apiRequest<{ opportunities: Opportunity[] }>(endpoint, "GET", null, true)
      .then((data) => {
        if (!Array.isArray(data?.opportunities))
          throw new Error("Could not read the opportunity list.");
        if (current) {
          setRows(data.opportunities);
          setLoadError("");
        }
      })
      .catch((err) => {
        if (current) setLoadError(message(err));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    apiRequest<WorkRole[]>("/api/admin/work-positions", "GET", null, true)
      .then((data) => {
        if (!Array.isArray(data))
          throw new Error("Could not read the work roles.");
        if (current) {
          setRoles(data);
          setRoleError("");
        }
      })
      .catch((err) => {
        if (current) setRoleError(message(err));
      });
    apiRequest<Revenue>("/api/admin/marketplace-revenue", "GET", null, true)
      .then((data) => {
        if (
          data?.currency !== "USD" ||
          ![data.rent, data.buy].every(
            (group) =>
              Number.isFinite(group?.total) && Number.isInteger(group?.count),
          )
        ) {
          throw new Error("Could not read settled payment totals.");
        }
        if (current) {
          setRevenue(data);
          setRevenueError(false);
        }
      })
      .catch(() => {
        if (current) {
          setRevenue(null);
          setRevenueError(true);
        }
      });
    return () => {
      current = false;
    };
  }, [reload]);

  function refresh() {
    setLoading(true);
    setReload((value) => value + 1);
  }
  async function openListing(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { opportunity } = await apiRequest<{
        opportunity: OpportunityDetail;
      }>(endpoint + "/" + encodeURIComponent(id), "GET", null, true);
      setEdit({ existing: opportunity, draft: toDraft(opportunity) });
      setConflict(false);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setEdit((current) =>
      current
        ? { ...current, draft: { ...current.draft, [key]: value } }
        : null,
    );
    setError("");
  }
  function closeEditor() {
    if (
      edit &&
      JSON.stringify(edit.draft) !== JSON.stringify(toDraft(edit.existing)) &&
      !window.confirm("Discard unsaved listing changes?")
    )
      return;
    setEdit(null);
    setConflict(false);
    setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit || busy || writing.current || edit.existing?.availability === "sold") return;
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const status: ListingStatus =
      submitter?.value === "publish"
        ? "published"
        : (edit.existing?.status ?? "draft");
    const validation = editorError(edit.draft, status, roles, edit.existing);
    if (validation) {
      setError(validation);
      return;
    }
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      const url = edit.existing
        ? endpoint + "/" + encodeURIComponent(edit.existing._id)
        : endpoint;
      await apiRequest(
        url,
        edit.existing ? "PATCH" : "POST",
        { ...listingPayload(edit.draft, status), ...(edit.existing && { expectedRevision: edit.existing.revision }) },
        true,
      );
      setNotice(
        status === "published"
          ? "Published opportunity saved."
          : "Opportunity saved.",
      );
      setEdit(null);
      refresh();
    } catch (err) {
      setConflict(err instanceof ApiError && err.status === 409);
      setError(message(err));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  async function changeVisibility(status: "draft" | "archived") {
    const existing = edit?.existing;
    if (!existing || busy || writing.current || (existing.availability === "sold" && status !== "archived")) return;
    if (
      !window.confirm(
        `Move the saved listing to ${status}? This hides it from discovery. Existing rentals and purchases keep their recorded terms. Any unsaved edits will be discarded.`,
      )
    )
      return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        endpoint + "/" + encodeURIComponent(existing._id),
        "PATCH",
        { status, expectedRevision: existing.revision },
        true,
      );
      setNotice(status === "archived" ? "Opportunity archived." : "Opportunity moved to drafts.");
      setEdit(null);
      refresh();
    } catch (err) {
      setConflict(err instanceof ApiError && err.status === 409);
      setError(message(err));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const existing = edit?.existing;
  const sold = existing?.availability === "sold";
  const draft = edit?.draft;
  const activeRoles = roles.filter((role) => role.active !== false);
  const selectedRole = roles.find((role) => role._id === draft?.workPositionId);
  const visibleRows = rows.filter(
    (row) =>
      filter === "all" ||
      row.availability === filter || row.status === filter,
  );
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 text-slate-200 sm:px-6 lg:py-9">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {edit && (
            <button
              type="button"
              onClick={closeEditor}
              disabled={busy}
              className="mb-2 text-sm text-cyan-300 hover:underline"
            >
              ← All opportunities
            </button>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {edit
              ? existing
                ? sold
                  ? "Sold opportunity"
                  : "Edit opportunity"
                : "New opportunity"
              : "Opportunities"}
          </h1>
        </div>
        {!edit && (
          <button
            type="button"
            className={primary}
            disabled={busy || loading || !!loadError}
            onClick={() => {
              setNotice("");
              setError("");
              setConflict(false);
              setEdit({ draft: toDraft() });
            }}
          >
            New opportunity
          </button>
        )}
      </header>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-700 bg-emerald-950/60 p-3 text-sm text-emerald-100"
        >
          {notice}
        </p>
      )}
      {error && !edit && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-100"
        >
          {error}
        </p>
      )}
      {!draft ? (
        <>
          {revenue && (
            <dl
              aria-label="Settled opportunity payments"
              className="mb-5 grid gap-3 sm:grid-cols-2"
            >
              {(["rent", "buy"] as const).map((kind) => (
                <div className={panel} key={kind}>
                  <dt className="text-sm text-slate-300">
                    {kind === "rent"
                      ? "Settled rentals"
                      : "Settled exclusive sales"}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-white">
                    {money.format(revenue[kind].total)}{" "}
                    <span className="text-xs text-slate-400">USD</span>
                  </dd>
                  <dd className="mt-1 text-sm text-slate-400">
                    {revenue[kind].count}{" "}
                    {revenue[kind].count === 1 ? "settlement" : "settlements"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {revenueError && (
            <p className="mb-4 text-sm text-slate-300" role="status">
              Settled payment totals are unavailable.{" "}
              <button
                type="button"
                onClick={refresh}
                className="text-cyan-300 underline"
              >
                Retry
              </button>
            </p>
          )}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              Status{" "}
              <select
                aria-label="Filter opportunities by status"
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All listings</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="sold">Sold</option>
              </select>
            </label>
            <Link
              href="/admin/work-positions"
              className="text-sm text-cyan-300 hover:underline"
            >
              Manage work roles
            </Link>
          </div>
          {loading ? (
            <p className={panel} role="status">
              Loading opportunities…
            </p>
          ) : loadError ? (
            <div className={panel} role="alert">
              {loadError}{" "}
              <button type="button" className={secondary} onClick={refresh}>
                Retry
              </button>
            </div>
          ) : !visibleRows.length ? (
            <p className={panel}>
              {filter === "all"
                ? "No opportunities yet."
                : "No opportunities with this status."}
            </p>
          ) : (
            <ul className="space-y-3">
              {visibleRows.map((row) => (
                <li key={row._id} className={panel}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        {row.availability === "sold"
                          ? row.status === "archived" ? "Sold · archived" : "Sold · closed"
                          : row.availability === "rented"
                            ? row.status + " · rented"
                            : row.status}
                      </p>
                      <h2 className="break-words text-lg font-semibold text-white">
                        {row.title || "Untitled draft"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-300">
                        {[
                          row.applyEnabled && "Free application",
                          row.rentEnabled &&
                            (row.rentPrice && row.rentalDays
                              ? `Rent ${money.format(row.rentPrice)} / ${row.rentalDays} days`
                              : "Rental terms incomplete"),
                          row.buyEnabled &&
                            (row.buyPrice
                              ? `Buy ${money.format(row.buyPrice)}`
                              : "Buyout price incomplete"),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No access options configured"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={secondary}
                      disabled={busy}
                      onClick={() => openListing(row._id)}
                      aria-label={`${row.availability === "sold" ? "View" : "Edit"} ${row.title || "untitled draft"}`}
                    >
                      {row.availability === "sold" ? "View" : "Edit"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <OpportunityReceipts />
        </>
      ) : (
        <form onSubmit={save} noValidate>
          {sold && (
            <p role="status" className="mb-4 text-sm text-amber-200">
              Exclusive ownership has transferred. {existing?.status === "archived" ? "This listing has been archived." : "You can archive this listing."}
            </p>
          )}
          {existing?.availability === "rented" && (
            <p role="status" className="mb-4 text-sm text-amber-200">
              An active renter holds this project. Changes apply to future
              offers.
            </p>
          )}
          <fieldset disabled={sold || busy} className="min-w-0 space-y-4">
            <section className={panel}>
              <h2 className="mb-4 text-lg font-semibold text-white">
                Public listing
              </h2>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Field label="Project title">
                  <input
                    className={input}
                    maxLength={160}
                    value={draft.title}
                    onChange={(e) => change("title", e.target.value)}
                  />
                </Field>
                <Field label="Category">
                  <select
                    className={input}
                    value={draft.category}
                    onChange={(e) => change("category", e.target.value)}
                  >
                    <option value="">Choose a category</option>
                    {projectCategories.map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Public description">
                  <textarea
                    className={input}
                    rows={4}
                    maxLength={4000}
                    value={draft.description}
                    onChange={(e) => change("description", e.target.value)}
                  />
                </Field>
              </div>
            </section>
            <section className={panel}>
              <h2 className="mb-2 text-lg font-semibold text-white">
                Access options
              </h2>
              <Mode
                label="Apply for free"
                checked={draft.applyEnabled}
                onChange={(v) => change("applyEnabled", v)}
              >
                <Field label="Linked work role">
                  <select
                    className={input}
                    value={draft.workPositionId}
                    disabled={!!existing?.firstPublishedAt}
                    onChange={(e) => change("workPositionId", e.target.value)}
                  >
                    <option value="">Choose an active role</option>
                    {draft.workPositionId &&
                      !activeRoles.some(
                        (role) => role._id === draft.workPositionId,
                      ) && (
                        <option value={draft.workPositionId}>
                          {selectedRole?.title ?? "Linked role"} (unavailable)
                        </option>
                      )}
                    {activeRoles.map((role) => {
                      const taken = rows.some(
                        (listing) =>
                          listing._id !== existing?._id &&
                          listing.workPositionId === role._id,
                      );
                      return (
                        <option
                          key={role._id}
                          value={role._id}
                          disabled={taken}
                        >
                          {role.title}
                          {taken ? " (already linked)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </Field>
                {existing?.firstPublishedAt && (
                  <p className="mt-2 text-sm text-slate-400">
                    The linked role is fixed after first publication.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-cyan-300">
                  <Link href="/admin/work-positions" target="_blank" rel="noopener noreferrer" className="underline">Manage job roles in a new tab</Link>
                  <button type="button" onClick={refresh} className="underline">Refresh role choices</button>
                </div>
                {roleError && (
                  <p className="mt-2 text-sm text-amber-200" role="alert">
                    Work roles could not load.{" "}
                    <button
                      type="button"
                      onClick={refresh}
                      className="underline"
                    >
                      Retry
                    </button>
                  </p>
                )}
              </Mode>
              {!draft.applyEnabled && draft.workPositionId && (
                <div className="mb-3 text-sm text-slate-300">
                  Linked role: {selectedRole?.title ?? "Previously linked role"}. Applications are closed.
                  {!existing?.firstPublishedAt && <button type="button" onClick={() => change("workPositionId", "")} className="ml-2 text-cyan-300 underline">Unlink role</button>}
                </div>
              )}
              <Mode
                label="Rent project"
                checked={draft.rentEnabled}
                onChange={(v) => change("rentEnabled", v)}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fixed rental price (USD)">
                    <input
                      className={input}
                      inputMode="decimal"
                      value={draft.rentPrice}
                      onChange={(e) => change("rentPrice", e.target.value)}
                    />
                  </Field>
                  <Field label="Rental duration (days)">
                    <input
                      className={input}
                      inputMode="numeric"
                      value={draft.rentalDays}
                      onChange={(e) => change("rentalDays", e.target.value)}
                    />
                  </Field>
                </div>
              </Mode>
              <Mode
                label="Buy outright"
                checked={draft.buyEnabled}
                onChange={(v) => change("buyEnabled", v)}
              >
                <Field label="Exclusive buyout price (USD)">
                  <input
                    className={input}
                    inputMode="decimal"
                    value={draft.buyPrice}
                    onChange={(e) => change("buyPrice", e.target.value)}
                  />
                </Field>
                <p className="mt-2 text-sm text-slate-400">
                  A completed buyout transfers exclusive rights and closes the
                  listing.
                </p>
              </Mode>
            </section>
            <section className={panel}>
              <h2 className="mb-3 text-lg font-semibold text-white">
                Handoff and publication rights
              </h2>
              <Field label="Private project handoff">
                <textarea
                  className={input}
                  rows={4}
                  maxLength={8000}
                  value={draft.deliverable}
                  onChange={(e) => change("deliverable", e.target.value)}
                />
              </Field>
              <p className="mt-2 text-sm text-slate-400">
                Handoff instructions are delivered to an eligible paid renter or
                buyer. Keep private access details out of the public
                description.
              </p>
              <label className="mt-4 flex items-start gap-2 text-sm">
                <input
                  className="mt-0.5 size-4 shrink-0 accent-cyan-300"
                  type="checkbox"
                  checked={draft.rightsConfirmed}
                  onChange={(e) => change("rightsConfirmed", e.target.checked)}
                />
                The rights holder authorizes these access options and the
                handoff described above.
              </label>
            </section>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-100"
              >
                {error}
              </p>
            )}
            {!sold && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  value="save"
                  className={
                    existing?.status === "published" ? primary : secondary
                  }
                >
                  {busy
                    ? "Saving…"
                    : existing?.status === "published"
                      ? "Save published changes"
                      : existing?.status === "archived"
                        ? "Save archived changes"
                        : "Save draft"}
                </button>
                {existing?.status !== "published" && (
                  <button type="submit" value="publish" className={primary}>
                    Publish opportunity
                  </button>
                )}
              </div>
            )}
          </fieldset>
          {existing && <div className="mt-4 flex flex-wrap gap-3">
            {!sold && existing.status !== "draft" && <button type="button" className={secondary} disabled={busy} onClick={() => changeVisibility("draft")}>Move to draft</button>}
            {existing.status !== "archived" && <button type="button" className={secondary} disabled={busy} onClick={() => changeVisibility("archived")}>Archive listing</button>}
            {conflict && <button type="button" className={secondary} disabled={busy} onClick={() => {
              if (window.confirm("Replace your unsaved edits with the latest saved listing?")) void openListing(existing._id);
            }}>Reload saved listing</button>}
          </div>}
        </form>
      )}
    </div>
  );
}
