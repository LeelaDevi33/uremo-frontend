"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Receipt = {
  _id: string; title: string; holder: string; type: "rent" | "buy";
  amount: number; currency: string; startsAt: string; endsAt?: string;
};
type Result = { receipts: Receipt[]; nextCursor: string | null };
const date = (value: string) => new Date(value).toLocaleString();

export default function OpportunityReceipts() {
  const [type, setType] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const before = cursors.at(-1);

  useEffect(() => {
    let current = true;
    const query = new URLSearchParams();
    if (type) query.set("type", type);
    if (before) query.set("before", before);
    setResult(null);
    setError("");
    apiRequest<Result>(`/api/admin/marketplace-receipts?${query}`, "GET", null, true)
      .then(value => { if (current) setResult(value); })
      .catch(() => { if (current) setError("Receipts could not be loaded."); });
    return () => { current = false; };
  }, [type, before, version]);

  return <section aria-labelledby="receipt-heading" className="mt-8 rounded-xl border border-slate-700 p-5 text-slate-200">
    <div className="flex flex-wrap items-center gap-4">
      <h2 id="receipt-heading" className="mr-auto text-xl font-semibold">Access receipts</h2>
      <select aria-label="Receipt type" className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
        value={type} onChange={event => { setCursors([]); setType(event.target.value); }}>
        <option value="">All receipts</option><option value="rent">Rentals</option><option value="buy">Exclusive sales</option>
      </select>
      <button type="button" className="underline" onClick={() => { setCursors([]); setVersion(v => v + 1); }}>Refresh receipts</button>
    </div>
    {error ? <p role="alert" className="mt-4">{error}</p> : !result ? <p role="status" className="mt-4">Loading receipts…</p> :
      !result.receipts.length ? <p className="mt-4">No matching receipts.</p> :
      <ul className="mt-4 divide-y divide-slate-700">{result.receipts.map(row =>
        <li key={row._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
          <div><strong>{row.title}</strong><p>{row.holder} · {row.type === "buy" ? "Exclusive purchase" : "Rental"}</p></div>
          <div><strong>{new Intl.NumberFormat(undefined, { style: "currency", currency: row.currency }).format(row.amount)}</strong>
            <p>{date(row.startsAt)}{row.endsAt && <> · Expires {date(row.endsAt)}</>}</p></div>
        </li>)}</ul>}
    {(cursors.length > 0 || result?.nextCursor) && <div className="mt-3 flex gap-5">
      {cursors.length > 0 && <button type="button" className="underline" onClick={() => setCursors(c => c.slice(0, -1))}>Newer receipts</button>}
      {result?.nextCursor && <button type="button" className="underline" onClick={() => setCursors([...cursors, result.nextCursor!])}>Older receipts</button>}
    </div>}
  </section>;
}
