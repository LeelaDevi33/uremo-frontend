"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { grantDate, type AccessGrant } from "@/lib/opportunities";
import { formatPrice } from "@/lib/orderPrice";
import { BackToMarket, LoadingState, MarketIcon, MarketPage, Notice } from "./MarketUI";
import { useOpportunityData } from "./useOpportunityData";
import styles from "./market.module.css";

function Delivery({ grant, token }: { grant: AccessGrant; token: string }) {
  const { state, reload } = useOpportunityData<{ grant: AccessGrant; deliverable: string }>(
    `/api/opportunities/${grant.opportunityId}/access`, token,
  );
  if (state.phase === "loading") return <LoadingState label="Checking your access…" />;
  if (state.phase === "error" && state.error instanceof ApiError && state.error.status === 403) {
    return <p className={styles.alert} role="status">Access has ended. Refresh your access list for the latest status.</p>;
  }
  if (state.phase !== "loaded" || !state.data.grant?.active || state.data.grant._id !== grant._id || typeof state.data.deliverable !== "string") {
    return <Notice title="Access details could not be loaded" retry={reload} />;
  }
  return <div className={styles.delivery}><h3>Access details</h3><p className={styles.longText}>{state.data.deliverable || "Delivery instructions have not been provided."}</p></div>;
}

function GrantCard({ grant, token }: { grant: AccessGrant; token: string }) {
  const [open, setOpen] = useState(false);
  const rented = grant.type === "rent";
  return <article className={styles.grant}>
    <div className={styles.cardMeta}>
      <span className={styles.category}><MarketIcon name={grant.type} />{rented ? "Rental" : "Owned"}</span>
      <span className={grant.active ? styles.active : styles.status}>{grant.active ? "Active access" : "Ended"}</span>
    </div>
    <h2>{grant.title}</h2>
    {!rented && <p>Exclusive project rights</p>}
    {grant.projectScope && <details><summary>Project scope at checkout</summary><p className={styles.longText}>{grant.projectScope}</p></details>}
    <dl className={styles.receipt}>
      <div><dt>Paid</dt><dd>{formatPrice(grant.amount, grant.currency)}</dd></div>
      <div><dt>{rented ? "Starts" : "Purchased"}</dt><dd>{grantDate(grant.startsAt)}</dd></div>
      <div><dt>{rented ? "Ends" : "Access term"}</dt><dd>{rented ? grantDate(grant.endsAt) : "Permanent"}</dd></div>
    </dl>
    <div className={styles.buttonRow}>
      {grant.active && <button type="button" className={styles.secondary} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Hide access details" : "Show access details"}</button>}
      <Link className={styles.textLink} href={`/opportunities/${grant.opportunityId}`}>View opportunity <MarketIcon name="arrow" size={15} /></Link>
    </div>
    {open && grant.active && <Delivery grant={grant} token={token} />}
  </article>;
}

function MyGrants({ token }: { token: string }) {
  const { state, reload } = useOpportunityData<{ grants: AccessGrant[] }>("/api/opportunities/mine", token);
  const grants = state.phase === "loaded" && Array.isArray(state.data.grants) ? state.data.grants : null;
  useEffect(() => {
    if (!grants) return;
    const now = Date.now();
    const expiries = grants.filter(grant => grant.active && grant.type === "rent" && grant.endsAt)
      .map(grant => Date.parse(grant.endsAt!)).filter(time => Number.isFinite(time) && time > now);
    if (!expiries.length) return;
    const timer = window.setTimeout(reload, Math.min(Math.min(...expiries) - now + 250, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [grants, reload]);

  if (state.phase === "loading") return <LoadingState label="Loading your access…" />;
  if (!grants) return <Notice title="Your access could not be loaded" retry={reload}><p>Check your connection and try again.</p></Notice>;
  if (!grants.length) return <Notice title="You have no rentals or purchases"><p>Your paid opportunities and their access details will appear here.</p><Link className={styles.primary} href="/explore-services">Explore opportunities <MarketIcon name="arrow" size={16} /></Link></Notice>;
  return <>
    <div className={styles.libraryTools}><span>{grants.length} {grants.length === 1 ? "record" : "records"}</span><button className={styles.textLink} type="button" onClick={reload}>Refresh access</button></div>
    <div className={styles.grid}>{grants.map(grant => <GrantCard key={grant._id} grant={grant} token={token} />)}</div>
  </>;
}

export default function OpportunityAccess() {
  const { ready, token } = useAuth();
  return <MarketPage>
    <BackToMarket />
    <header className={styles.hero}><div><h1>My opportunity access</h1><p>Your rentals, purchases and delivery instructions.</p></div></header>
    {!ready ? <LoadingState label="Checking your session…" /> : token ? <MyGrants key={token} token={token} /> :
      <Notice title="Sign in to see your access"><p>Use the account that rented or purchased the opportunity.</p>
        <Link className={styles.primary} href="/login?next=%2Fopportunities%2Faccess">Sign in</Link></Notice>}
  </MarketPage>;
}
