"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import { paypalApprovalUrl, type FundingOptions } from "@/lib/walletFunding";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white";

export default function WalletFundingDialog({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<FundingOptions | null>(null);
  const [choice, setChoice] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const result = await apiRequest<FundingOptions>("/api/wallet/funding-methods", "GET", null, true);
      setOptions(result); setChoice(""); setReference("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load payment methods."); }
  }, []);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    void load();
    return () => el?.close();
  }, [load]);

  const methods = options?.methods.filter(method => method.active) || [];
  const method = methods.find(item => item._id === choice);
  const gateway = choice === "paypal" && options?.paypal.available;
  const hasOptions = methods.length > 0 || options?.paypal.available;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || (!method && !gateway)) return;
    const dollars = Number(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isFinite(dollars) || dollars < 1) {
      setError("Enter a USD amount of at least $1 with up to two decimal places."); return;
    }
    if (method && !/^[a-z0-9][a-z0-9._/-]{3,79}$/i.test(reference.trim())) {
      setError("Enter the payment reference using 4–80 letters, numbers, dots, slashes, hyphens or underscores."); return;
    }
    setBusy(true); setError("");
    try {
      if (gateway) {
        const order = await apiRequest<{ approvalUrl: string }>("/api/wallet/topup/paypal/create", "POST", { amount: dollars }, true);
        window.location.assign(paypalApprovalUrl(order.approvalUrl, options?.paypal.mode));
        return;
      }
      await apiRequest("/api/wallet/topup", "POST", { amount: dollars, methodId: method!._id, paymentReference: reference.trim() }, true);
      onSubmitted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Funding request could not be submitted.");
      setBusy(false);
    }
  }
  return <dialog ref={dialog} aria-labelledby="wallet-funding-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 text-white backdrop:bg-black/70"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="wallet-funding-title" className="text-xl font-bold">Add wallet funds</h2>
    {options && !hasOptions && <p className="mt-4 text-slate-300">No funding methods are available. Contact support for help funding your wallet.</p>}
    {!options && !error && <p role="status" className="mt-4">Loading payment methods…</p>}
    {error && <div role="alert" className="my-3 text-amber-200">{error} <button type="button" disabled={busy} onClick={load} className="underline">Reload methods</button></div>}
    <form onSubmit={submit} className="mt-4 space-y-4">
      {hasOptions && <>
        <label className="block text-sm">Payment method
          <select aria-label="Payment method" className={inputClass} required value={choice} onChange={e => { setChoice(e.target.value); setReference(""); setError(""); }}>
            <option value="">Choose a method</option>
            {methods.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
            {options?.paypal.available && <option value="paypal">{options.paypal.mode === "sandbox" ? "PayPal (sandbox)" : "PayPal"}</option>}
          </select></label>
        {method && <div className="rounded bg-slate-800 p-3 text-sm"><strong>Receiving details</strong><p className="mt-1 whitespace-pre-wrap break-words">{method.details}</p>
          {method.instructions && <p className="mt-2 whitespace-pre-wrap break-words text-slate-300">{method.instructions}</p>}</div>}
        <label className="block text-sm">Amount (USD)<input className={inputClass} required type="number" min="1" step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        {method && <label className="block text-sm">Payment reference<input aria-label="Payment reference" required minLength={4} maxLength={80} className={inputClass} value={reference} onChange={e => setReference(e.target.value)} />
          <span className="mt-1 block text-xs text-slate-300">Enter the reference from your completed transfer. Your balance updates after verification.</span></label>}
      </>}
      <div className="flex flex-wrap gap-3"><button type="button" onClick={onClose} disabled={busy} className="rounded border border-slate-600 px-4 py-2">Cancel</button>
        {hasOptions && <button disabled={busy || !choice} className="rounded bg-emerald-700 px-4 py-2 font-semibold disabled:opacity-50">{busy ? "Processing…" : gateway ? "Continue to PayPal" : "Submit payment reference"}</button>}</div>
    </form>
  </dialog>;
}
