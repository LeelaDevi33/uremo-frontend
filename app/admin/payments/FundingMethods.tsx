"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import type { AdminFundingOptions, FundingMethod } from "@/lib/walletFunding";

const blank = { name: "", details: "", instructions: "", active: false };
const fieldClass = "mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white";

export default function FundingMethods() {
  const [options, setOptions] = useState<AdminFundingOptions | null>(null);
  const [draft, setDraft] = useState<FundingMethod | typeof blank | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setOptions(await apiRequest<AdminFundingOptions>("/api/admin/payments/funding", "GET", null, true)); }
    catch (cause) { setOptions(null); setError(cause instanceof Error ? cause.message : "Could not load funding methods."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function toggleGateway() {
    if (saving || !options) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const enabled = !options.paypal.enabled;
      await apiRequest("/api/admin/payments/funding/paypal", "PATCH", { enabled, updatedAt: options.paypal.updatedAt }, true);
      await load();
      setNotice(enabled ? "PayPal enabled for new wallet payments." : "PayPal paused for new wallet payments.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update PayPal.");
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const id = "_id" in draft ? draft._id : "";
      const data = { name: draft.name.trim(), details: draft.details.trim(), instructions: draft.instructions.trim(), active: draft.active,
        ...("_id" in draft ? { updatedAt: draft.updatedAt } : {}) };
      await apiRequest("/api/admin/payments/funding" + (id ? "/" + id : ""), id ? "PATCH" : "POST", data, true);
      setNotice("Funding method saved."); setDraft(null);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The funding method could not be saved."); }
    finally { setSaving(false); }
  }
  return <section aria-labelledby="funding-title" className="space-y-4 rounded-xl border border-slate-700 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="funding-title" className="text-lg font-semibold">Wallet funding methods</h2>
        <p className="mt-1 text-sm text-slate-400">Active methods and their receiving details appear in the worker’s wallet.</p></div>
      {options && !draft && <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-white" onClick={() => { setDraft({ ...blank }); setError(""); setNotice(""); }}>Add funding method</button>}
    </div>
    {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    {error && <p role="alert" className="text-amber-200">{error} <button className="underline" disabled={saving} onClick={() => { setDraft(null); void load(); }}>{draft ? "Reload saved methods" : "Retry"}</button></p>}
    {options ? <>
      {options.methods.length > 0 ? <ul className="divide-y divide-slate-700">{options.methods.map(item => <li key={item._id} className="py-3">
        <div className="flex items-center gap-3"><strong>{item.name}</strong><span className="text-sm text-slate-300">{item.active ? "Active" : "Inactive"}</span>
          <button type="button" className="ml-auto underline disabled:opacity-50" aria-label={`Edit ${item.name}`} disabled={Boolean(draft)} onClick={() => { setDraft({ ...item }); setError(""); setNotice(""); }}>Edit</button></div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">{item.details}</p>
      </li>)}</ul> : <p className="text-sm text-slate-300">No manual funding methods have been added.</p>}
      <div className="space-y-2 border-t border-slate-700 pt-4">
        <h3 className="font-semibold">PayPal wallet payments</h3>
        <p className="text-sm text-slate-300">{options.paypal.configured
          ? `${options.paypal.mode === "sandbox" ? "Sandbox" : "Live"} · ${options.paypal.available ? "Enabled" : "Paused"}`
          : "Unconfigured. Add the merchant credentials and webhook ID in the backend environment before enabling PayPal."}</p>
        <button type="button" className="rounded border border-slate-600 px-3 py-2 disabled:opacity-50"
          disabled={saving || Boolean(draft) || (!options.paypal.enabled && !options.paypal.configured)} onClick={toggleGateway}>
          {options.paypal.enabled ? "Pause PayPal" : "Enable PayPal"}
        </button>
      </div>
    </> : !error && <p role="status">Loading funding methods…</p>}
    {draft && <form onSubmit={save} className="space-y-4 rounded-lg border border-slate-600 p-4">
      <h3 className="font-semibold">{"_id" in draft ? "Edit funding method" : "New funding method"}</h3>
      <label className="block text-sm">Method name<input aria-label="Method name" required maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={fieldClass} /></label>
      <label className="block text-sm">Receiving details<textarea aria-label="Receiving details" required maxLength={500} rows={2} value={draft.details} onChange={e => setDraft({ ...draft, details: e.target.value })} className={fieldClass} /></label>
      <label className="block text-sm">Transfer instructions<textarea aria-label="Transfer instructions" maxLength={1000} rows={2} value={draft.instructions} onChange={e => setDraft({ ...draft, instructions: e.target.value })} className={fieldClass} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />Active in worker wallets</label>
      <div className="flex gap-4"><button className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" disabled={saving}>{saving ? "Saving…" : "Save funding method"}</button>
        <button type="button" className="underline" disabled={saving} onClick={() => { setDraft(null); setError(""); }}>Cancel</button></div>
    </form>}
  </section>;
}
