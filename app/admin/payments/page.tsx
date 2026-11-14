"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import FundingMethods from "./FundingMethods";

type Method = { _id: string; name?: string; label?: string; type: string; active: boolean };

export default function AdminPaymentsPage() {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Method | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      setMethods(await apiRequest<Method[]>("/api/admin/payments", "GET", null, true));
    } catch { setError("Payment methods could not be loaded."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function disable() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const saved = await apiRequest<Method>(`/api/admin/payments/${selected._id}`, "PUT", { active: false }, true);
      setMethods(previous => previous?.map(method => method._id === saved._id ? saved : method) ?? null);
      setError(""); setSelected(null);
    } catch { setError("The method could not be disabled. Try again."); }
    finally { setSaving(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6 text-slate-200">
    <h1 className="text-2xl font-semibold">Payment operations</h1>
    <div className="flex flex-wrap gap-5 text-emerald-300">
      <Link className="underline" href="/admin/opportunities#receipt-heading">Project access receipts</Link>
      <Link className="underline" href="/admin/wallet">Wallet and manual top-ups</Link>
      <Link className="underline" href="/admin/orders">Historical orders</Link>
    </div>
    <FundingMethods />
    <section className="rounded-xl border border-slate-700 p-5">
      <h2 className="text-lg font-semibold">Historical payment methods</h2>
      <p className="mt-1 text-sm text-slate-400">These methods belong to earlier orders. Project rentals and purchases use wallet funds.</p>
      {error && <p role="alert" className="mt-3">{error} <button className="underline" onClick={load}>Reload</button></p>}
      {methods === null ? !error && <p role="status">Loading…</p> : methods.length === 0 ? <p className="mt-4">No historical methods.</p> :
        <ul className="mt-3 divide-y divide-slate-700">{methods.map(method => <li key={method._id} className="flex flex-wrap items-center gap-3 py-3">
          <strong>{method.name || method.label || method.type}</strong><span>{method.active ? "Active on earlier orders" : "Disabled"}</span>
          {method.active && selected?._id !== method._id && <button className="ml-auto underline" onClick={() => setSelected(method)}>Disable</button>}
          {selected?._id === method._id && <div className="w-full">
            <p>Disable this method for earlier orders? This action is permanent.</p>
            <button className="mr-4 underline" disabled={saving} onClick={() => setSelected(null)}>Cancel</button>
            <button className="underline" disabled={saving} onClick={disable}>Confirm disable</button>
          </div>}
        </li>)}</ul>}
    </section>
  </div>;
}
