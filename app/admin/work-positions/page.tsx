"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { projectCategories } from "../opportunities/editor";
import { briefFields, briefPayload, experienceLabels, roleReviewNotes, workModeLabels, type RoleBrief } from "./roleBrief";

type Role = RoleBrief & {
  _id: string; title: string; category: string;
  adminNotes?: string; active?: boolean; isSpecialization?: boolean; sortOrder?: number; revision?: string; updatedAt?: string;
  directoryExclusionReason?: string;
  hasScreening?: boolean; screeningId?: unknown; screeningIds?: unknown[]; trainingMaterials?: unknown[];
};
function fields(role?: Role) {
  return { title: role?.title ?? "", category: role?.category ?? "", ...briefFields(role),
    adminNotes: role?.adminNotes ?? "", active: role?.active !== false,
    sortOrder: String(role?.sortOrder ?? 0) };
}
const endpoint = "/api/admin/work-positions";
const input = "u-input mt-1 block w-full";
const panel = "rounded-xl border border-slate-700/70 bg-[#101824] p-4 sm:p-6";
function message(error: unknown) { return error instanceof Error ? error.message : "The request failed."; }

export default function AdminWorkPositionsPage() {
  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [editor, setEditor] = useState<{ role?: Role; draft: ReturnType<typeof fields> } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [revision, setRevision] = useState(0);
  const initialLink = useRef(true);
  const reload = () => { setLoading(true); setRevision(v => v + 1); };
  useEffect(() => {
    let current = true;
    apiRequest<Role[]>(endpoint, "GET", null, true).then(roles => {
      if (!current) return;
      if (!Array.isArray(roles)) throw new Error("The role list could not be read.");
      setRows(roles);
      if (initialLink.current) {
        initialLink.current = false;
        const id = new URLSearchParams(window.location.search).get("edit");
        if (id) {
          const role = roles.find(row => row._id === id);
          if (role) setEditor({ role, draft: fields(role) });
          else setError("The linked job role could not be found.");
        }
      }
    }).catch(cause => { if (current) setError(message(cause)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);
  function edit(role?: Role) {
    setEditor({ role, draft: fields(role) }); setConflict(false); setError(""); setNotice("");
  }
  function close() {
    if (editor && JSON.stringify(editor.draft) !== JSON.stringify(fields(editor.role)) && !window.confirm("Discard unsaved role changes?")) return;
    setEditor(null); setError(""); setConflict(false);
    window.history.replaceState(null, "", "/admin/work-positions");
  }
  async function mutate(action: "save" | "toggle" | "delete", role?: Role) {
    if (lock.current) return;
    const version = role?.revision ?? role?.updatedAt;
    if (role && !version) { setError("Reload this role to obtain its current version."); return; }
    const draft = editor?.draft;
    if (action === "save" && (!draft || !draft.title.trim() || !draft.category.trim() || !/^-?\d+$/.test(draft.sortOrder) || !Number.isSafeInteger(Number(draft.sortOrder)))) {
      setError("Enter a title, category and whole-number display order."); return;
    }
    if (role && action === "delete" && !window.confirm(`Delete the unused role “${role.title}”?`)) return;
    if (role && action === "toggle" && role.active !== false && !window.confirm(`Deactivate “${role.title}” and close it to new applications?`)) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const body = action === "save" && draft ? { ...draft, ...briefPayload(draft), title: draft.title.trim(), category: draft.category.trim(), sortOrder: Number(draft.sortOrder) } :
        action === "toggle" ? { active: role?.active === false } : {};
      await apiRequest(role ? endpoint + "/" + role._id : endpoint, action === "delete" ? "DELETE" : role ? "PUT" : "POST",
        { ...body, ...(role && { expectedRevision: version }) }, true);
      setNotice(action === "delete" ? "Job role deleted." : action === "toggle" ? "Role availability updated." : "Job role saved.");
      setEditor(null); setConflict(false); window.history.replaceState(null, "", "/admin/work-positions"); reload();
    } catch (cause) {
      setError(message(cause));
      if (cause instanceof ApiError && cause.status === 409) { setConflict(true); reload(); }
    } finally { lock.current = false; setBusy(false); }
  }
  const categories = [...new Set(rows.map(row => row.category).filter(Boolean))].sort();
  const suggestions = [...new Set([...projectCategories.map(([value]) => value), ...categories])].sort();
  const notes = roleReviewNotes(rows);
  const visible = rows.filter(row => (!reviewOnly || notes.has(row._id)) && (!category || row.category === category) &&
    (active === "all" || (row.active !== false) === (active === "active")) &&
    [row.title, row.category, row.description, row.requirements, row.locationEligibility, ...(row.skills ?? [])].some(value => value?.toLowerCase().includes(query.toLowerCase().trim())));
  const draft = editor?.draft;
  function update(key: keyof ReturnType<typeof fields>, value: string | boolean) {
    setEditor(current => current && ({ ...current, draft: { ...current.draft, [key]: value } }));
    setError("");
  }
  function save(event: FormEvent) { event.preventDefault(); void mutate("save", editor?.role); }
  return <div className="mx-auto w-full max-w-6xl px-4 py-7 text-slate-200 sm:px-6">
    {editor ? <button type="button" className="mb-3 text-sm text-cyan-300" disabled={busy} onClick={close}>← All specializations</button> :
      <Link href="/admin/opportunities" className="text-sm text-cyan-300 hover:underline">Manage paid project offers</Link>}
    <header className="my-4 flex flex-wrap justify-between gap-3"><h1 className="text-3xl font-semibold">{editor ? editor.role ? "Edit specialization" : "New specialization" : "Specializations"}</h1>
      {!editor && <button className="btn-primary" type="button" onClick={() => edit()} disabled={busy || loading}>New specialization</button>}</header>
    {!editor && <p className="mb-4 text-sm text-slate-300">Workers apply to a specialization here. Set its requirements, then manage the applicants, screenings and projects for that role.</p>}
    {error && !editor && <p role="alert" className="mb-3 rounded border border-rose-800 bg-rose-950/40 p-3">{error}</p>}
    {notice && <p role="status" className="mb-3 rounded border border-emerald-800 bg-emerald-950/40 p-3">{notice}</p>}
    {draft && editor ? <form className={panel + " max-w-3xl"} onSubmit={save}>
      <fieldset disabled={busy} className="space-y-4">
        {editor.role?.directoryExclusionReason && <p className="text-sm text-amber-200">{editor.role.directoryExclusionReason}</p>}
        <div className="grid gap-4 sm:grid-cols-2"><label>Role title<input className={input} maxLength={80} required value={draft.title} onChange={e => update("title", e.target.value)} /></label>
        <label>Role category<input className={input} maxLength={48} required value={draft.category} list="job-role-categories" onChange={e => update("category", e.target.value)} />
          <datalist id="job-role-categories">{suggestions.map(value => <option key={value} value={value} />)}</datalist></label></div>
        <fieldset className="space-y-4 border-y border-white/10 py-4">
          <legend className="px-1 font-semibold">Public role brief</legend>
          <label className="block">Public description<textarea aria-label="Public description" className={input} rows={3} maxLength={800} value={draft.description} onChange={e => update("description", e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Experience level<select aria-label="Experience level" className={input} value={draft.experienceLevel} onChange={e => update("experienceLevel", e.target.value)}>
              <option value="">Unspecified</option>
              {Object.entries(experienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Work mode<select aria-label="Work mode" className={input} value={draft.workMode} onChange={e => update("workMode", e.target.value)}>
              <option value="">Unspecified</option>
              {Object.entries(workModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Eligible locations<input className={input} maxLength={160} value={draft.locationEligibility} onChange={e => update("locationEligibility", e.target.value)} /></label>
            <label>Time commitment<input className={input} maxLength={120} value={draft.timeCommitment} onChange={e => update("timeCommitment", e.target.value)} /></label>
          </div>
          <label className="block">Skills<textarea aria-label="Skills" aria-describedby="role-skill-hint" className={input} rows={3} value={draft.skills} onChange={e => update("skills", e.target.value)} /></label>
          <p id="role-skill-hint" className="text-xs text-slate-400">Enter up to 12 skills, one per line.</p>
          <label className="block">Responsibilities<textarea aria-label="Responsibilities" aria-describedby="role-responsibility-hint" className={input} rows={3} value={draft.responsibilities} onChange={e => update("responsibilities", e.target.value)} /></label>
          <p id="role-responsibility-hint" className="text-xs text-slate-400">Enter up to 12 responsibilities, one per line.</p>
          <label className="block">Applicant requirements<textarea aria-label="Applicant requirements" className={input} rows={3} maxLength={1600} value={draft.requirements} onChange={e => update("requirements", e.target.value)} /></label>
        </fieldset>
        <label className="block">Private admin notes<textarea aria-label="Private admin notes" className={input} rows={2} maxLength={4000} value={draft.adminNotes} onChange={e => update("adminNotes", e.target.value)} /></label>
        <label className="block max-w-xs">Display order<input className={input} type="number" step="1" required value={draft.sortOrder} onChange={e => update("sortOrder", e.target.value)} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={e => update("active", e.target.checked)} /> Accept applications for this specialization</label>
        {error && <p role="alert" className="rounded border border-rose-800 bg-rose-950/40 p-3">{error}</p>}
        <div className="flex flex-wrap gap-3"><button className="btn-primary" type="submit" disabled={conflict}>{busy ? "Saving…" : "Save role"}</button>
          <button className="btn-secondary" type="button" onClick={close}>Cancel</button>
          {editor.role && conflict && <button className="btn-secondary" type="button" disabled={loading} onClick={() => {
            const latest = rows.find(row => row._id === editor.role?._id);
            if (latest && window.confirm("Replace your edits with the latest saved role?")) edit(latest);
          }}>Reload saved role</button>}</div>
      </fieldset>
    </form> : <>
      <div className={panel + " mb-4 grid gap-3 sm:grid-cols-3"}>
        <label>Search roles<input type="search" className={input} value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label>Filter by category<select className={input} value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(v => <option key={v}>{v}</option>)}</select></label>
        <label>Filter by availability<select className={input} value={active} onChange={e => setActive(e.target.value)}><option value="all">All roles</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label className="flex items-center gap-2 sm:col-span-3"><input type="checkbox" checked={reviewOnly}
          onChange={event => setReviewOnly(event.target.checked)} />Show open roles with review notes ({notes.size})</label>
      </div>
      {loading ? <p role="status">Loading roles…</p> : !visible.length ? <div className={panel}><p>{error ? "Roles could not be displayed." : rows.length ? "No roles match these filters." : "No specializations have been created."}</p></div> :
        <ul className="grid gap-3 md:grid-cols-2">{visible.map(role => <li className={panel + " min-w-0"} key={role._id}>
          <div className="flex items-start justify-between gap-2"><h2 className="break-words text-xl font-semibold">{role.title}</h2><span>{role.active === false ? "Inactive" : "Active"}</span></div>
          {role.isSpecialization === false && <p className="mt-2 text-sm">Outside role directory</p>}
          {role.directoryExclusionReason && <p className="mt-1 text-sm text-amber-200">{role.directoryExclusionReason}</p>}
          <p className="mt-1 text-sm text-slate-400">{role.category} · Display order {role.sortOrder ?? 0}</p>
          {notes.has(role._id) && <ul aria-label="Role review notes" className="mt-2 list-inside list-disc text-sm text-amber-200">
            {notes.get(role._id)?.map(note => <li key={note}>{note}</li>)}</ul>}
          {role.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{role.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2"><Link className="btn-primary" href={`/admin/work-positions/${role._id}`}>Manage specialization</Link>
            <button className="btn-secondary" type="button" disabled={busy} onClick={() => edit(role)}>Edit details</button>
            <button className="btn-secondary" type="button" disabled={busy} onClick={() => mutate("toggle", role)}>{role.active === false ? "Activate" : "Deactivate"}</button>
            <button className="text-sm text-rose-300" type="button" disabled={busy} onClick={() => mutate("delete", role)}>Delete role</button></div>
        </li>)}</ul>}
      {error && <button className="btn-secondary mt-3" type="button" onClick={() => {setError(""); reload();}}>Reload roles</button>}
    </>}
  </div>;
}
