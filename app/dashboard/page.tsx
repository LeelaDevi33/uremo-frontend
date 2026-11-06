"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/orderPrice";

type Wallet = { balance: number; lifetimeEarnings?: number };
type Grant = { active: boolean; type: "rent" | "buy" };
type Summary = { wallet?: Wallet; grants?: Grant[] };

export default function Dashboard() {
  const router = useRouter();
  const { user, token, ready, isAdmin } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attempt, retry] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    let current = true;
    Promise.allSettled([
      apiRequest<Wallet>("/api/wallet/balance", "GET", null, true),
      apiRequest<{ grants: Grant[] }>("/api/opportunities/mine", "GET", null, true),
    ]).then(([wallet, access]) => {
      if (current) setSummary({
        wallet: wallet.status === "fulfilled" ? wallet.value : undefined,
        grants: access.status === "fulfilled" ? access.value.grants : undefined,
      });
    });
    return () => { current = false; };
  }, [ready, token, router, attempt]);

  if (!ready || !token) return <p role="status" className="u-container">Opening your dashboard…</p>;

  const metrics = [
    { label: "Wallet balance", value: summary?.wallet ? formatPrice(summary.wallet.balance, "USD") : undefined, href: "/wallet" },
    { label: "Active project rentals", value: summary?.grants?.filter(g => g.active && g.type === "rent").length, href: "/opportunities/access" },
    { label: "Projects owned", value: summary?.grants?.filter(g => g.active && g.type === "buy").length, href: "/opportunities/access" },
  ];
  const shortcuts = [
    { title: "My project access", text: "Open handoffs, check rental expiry and review past access.", href: "/opportunities/access" },
    { title: "Work workspace", text: "Continue screenings and assigned work, or submit a project for review.", href: "/workspace" },
    { title: "My applications", text: "Review your role application and its status.", href: "/apply-to-work" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/15 pb-8">
        <div>
          <p className="mb-3 text-sm text-teal-300">Dashboard</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Your dashboard"}</h1>
        </div>
        <Link href="/explore-services" className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-200">Explore opportunities</Link>
      </header>

      <dl className="grid gap-5 border-b border-white/15 py-8 sm:grid-cols-3">
        {metrics.map(metric => (
          <div key={metric.label}>
            <dt className="text-sm text-slate-400">{metric.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums"><Link href={metric.href}>{metric.value ?? (summary ? "Unavailable" : "…")}</Link></dd>
          </div>
        ))}
      </dl>
      {summary && (!summary.wallet || !summary.grants) && (
        <p role="status" className="mt-4 text-sm text-amber-200">Some account details could not load. <button type="button" className="underline" onClick={() => { setSummary(null); retry(v => v + 1); }}>Try again</button></p>
      )}

      <h2 className="mt-10 text-2xl font-semibold">Your work</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {shortcuts.map(item => (
          <Link key={item.href} href={item.href} className="rounded-xl border border-white/15 bg-white/[0.035] p-5 hover:border-teal-300/70 focus-visible:outline-teal-300">
            <h3 className="font-semibold">{item.title} <span className="text-teal-300" aria-hidden="true">↗</span></h3>
            <p className="mt-2 text-sm text-slate-300">{item.text}</p>
          </Link>
        ))}
      </div>
      <nav aria-label="Account and history" className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300 underline underline-offset-4">
        <Link href="/orders">Order history</Link><Link href="/rentals">Earlier service rentals</Link><Link href="/wallet">Wallet activity</Link><Link href="/affiliate">Referrals</Link><Link href="/profile">Account settings</Link><Link href="/support">Support</Link>
        {isAdmin && <Link href="/admin" className="text-teal-300">Admin dashboard</Link>}
      </nav>
    </section>
  );
}
