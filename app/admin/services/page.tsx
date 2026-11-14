"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type LegacyService = {
  _id: string;
  title?: string;
  category?: string;
  description?: string;
  price?: number;
  currency?: string;
  deliveryType?: string;
  linkedJobId?: string;
};

export default function LegacyServicesPage() {
  const [services, setServices] = useState<LegacyService[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    apiRequest<LegacyService[] | { services: LegacyService[] }>(
      "/api/admin/services",
      "GET",
      null,
      true,
    )
      .then((data) => {
        if (current) {
          setServices(Array.isArray(data) ? data : data.services);
          setError("");
        }
      })
      .catch((err) => {
        if (current)
          setError(
            err instanceof Error
              ? err.message
              : "Could not load legacy services.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [reload]);

  const term = query.trim().toLowerCase();
  const matching = services.filter((service) =>
    [service._id, service.title, service.category].some((value) =>
      value?.toLowerCase().includes(term),
    ),
  );
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-slate-200 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Legacy services</h1>
          <p className="mt-2 text-sm text-slate-400">
            Read-only catalogue for historical orders, rentals and support.
          </p>
        </div>
        <Link
          href="/admin/opportunities"
          className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Manage project offers
        </Link>
      </div>
      <label className="block text-sm">
        Find by title, category or service ID
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
        />
      </label>
      {loading ? (
        <p className="py-5" role="status">
          Loading legacy services…
        </p>
      ) : error ? (
        <p className="py-5 text-rose-200" role="alert">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setLoading(true);
              setReload((n) => n + 1);
            }}
          >
            Retry
          </button>
        </p>
      ) : matching.length === 0 ? (
        <p className="py-5">No matching historical listings.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {matching.map((service) => (
            <li
              key={service._id}
              className="rounded-xl border border-slate-700/70 bg-[#101824] p-4"
            >
              <h2 className="font-semibold text-white">
                {service.title || "Untitled service"}
              </h2>
              <p className="mt-1 break-words text-sm text-slate-300">
                {[service.category, service.deliveryType]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Service ID {service._id}
                {typeof service.price === "number"
                  ? ` · Catalogue price ${service.currency || "USD"} ${service.price.toFixed(2)}`
                  : ""}
              </p>
              {service.description && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-slate-300">
                    Description
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words">
                    {service.description}
                  </p>
                </details>
              )}
              {service.linkedJobId && (
                <Link
                  className="mt-2 inline-block text-sm text-cyan-300 hover:underline"
                  href={`/admin/work-positions/${encodeURIComponent(service.linkedJobId)}`}
                >
                  View linked role
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
