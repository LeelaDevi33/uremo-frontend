"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { applicationPath, availableFor, grantDate, rentalTerm, type AccessGrant, type Opportunity, type PaidIntent } from "@/lib/opportunities";
import { formatPrice } from "@/lib/orderPrice";
import { BackToMarket, LoadingState, MarketIcon, MarketPage, Notice } from "./MarketUI";
import WalletConfirmation from "./WalletConfirmation";
import { useOpportunityData } from "./useOpportunityData";
import styles from "./market.module.css";

function Options({ item, refresh, onSuccess }: { item: Opportunity; refresh: () => void; onSuccess: (grant: AccessGrant) => void }) {
  const { token, ready } = useAuth();
  const [selected, setSelected] = useState<PaidIntent | null>(null);
  const apply = applicationPath(item);
  const next = (path: string) => `/login?next=${encodeURIComponent(path)}`;
  return <aside className={styles.options} aria-labelledby="access-options">
    <h2 id="access-options">Access options</h2>
    {item.availability === "sold" ? <p className={styles.closed}>This opportunity has been bought outright. Applications and purchases are closed.</p> :
      <>
        {item.availability === "rented" && <p className={styles.closed}>A rental is active. Paid access is unavailable until it ends.</p>}
        {apply && <section className={styles.option}>
          <div className={styles.optionName}><MarketIcon name="apply" /><h3>Apply for the role</h3><strong>Free</strong></div>
          <p>Send an application for review. The team will decide whether to move it forward.</p>
          {ready && <Link className={styles.secondary} href={token ? apply : next(apply)}>{token ? "Apply for this role" : "Sign in to apply"}<MarketIcon name="arrow" size={16} /></Link>}
        </section>}
        {(["rent", "buy"] as const).filter(type => availableFor(item, type)).map(type =>
          <section className={styles.option} key={type}>
            <div className={styles.optionName}><MarketIcon name={type} /><h3>{type === "rent" ? "Rent access" : "Buy outright"}</h3>
              <strong>{formatPrice(type === "rent" ? item.rentPrice : item.buyPrice, item.currency)}</strong></div>
            <p>{type === "rent" ? `One wallet payment for ${rentalTerm(item.rentalDays)} of exclusive access.` : "One wallet payment for permanent, exclusive access. The listing closes after purchase."}</p>
            {!selected && ready && (token ?
              <button type="button" className={styles.secondary} onClick={() => setSelected(type)}>Review {type === "rent" ? "rental" : "buyout"}<MarketIcon name="arrow" size={16} /></button> :
              <Link className={styles.secondary} href={next(`/opportunities/${item._id}`)}>Sign in to {type === "rent" ? "rent" : "buy"}<MarketIcon name="arrow" size={16} /></Link>)}
            {selected === type && token && <WalletConfirmation item={item} type={type} token={token} onCancel={() => setSelected(null)} onRefresh={refresh} onSuccess={onSuccess} />}
          </section>,
        )}
        {!apply && !availableFor(item, "rent") && !availableFor(item, "buy") && item.availability === "available" && <p className={styles.closed}>No access options are open.</p>}
      </>}
  </aside>;
}

export default function OpportunityDetail({ id }: { id: string }) {
  const validId = /^[a-f\d]{24}$/i.test(id);
  const { state, reload } = useOpportunityData<{ opportunity: Opportunity }>(validId ? `/api/opportunities/${id}` : null);
  const [receipt, setReceipt] = useState<AccessGrant | null>(null);
  const missing = !validId || (state.phase === "error" && state.error instanceof ApiError && state.error.status === 404);
  const item = state.phase === "loaded" ? state.data.opportunity : null;
  return <MarketPage>
    <BackToMarket />
    {receipt && <div className={styles.success} role="status">
      <MarketIcon name="check" /><div><strong>{receipt.type === "rent" ? "Rental confirmed" : "Buyout confirmed"}</strong>
        <p>{receipt.type === "rent" ? `Access ends ${grantDate(receipt.endsAt)}.` : "Permanent access is now yours."}</p>
        <Link href="/opportunities/access" className={styles.textLink}>Open My access <MarketIcon name="arrow" size={15} /></Link>
      </div></div>}
    {missing ? <Notice title="Opportunity unavailable"><p>This link does not point to a published opportunity.</p></Notice> :
      state.phase === "loading" ? <LoadingState label="Loading opportunity…" /> :
      !item ? <Notice title="Opportunity could not be loaded" retry={reload}><p>Check your connection and try again.</p></Notice> :
      <div className={styles.detailGrid}>
        <article className={styles.description}>
          <span className={styles.category}><MarketIcon name="work" />{item.category || "Opportunity"}</span>
          <h1>{item.title}</h1>
          <div className={styles.rule} />
          <h2>About this opportunity</h2>
          <p className={styles.longText}>{item.description || "A description has not been provided."}</p>
        </article>
        <Options item={item} refresh={reload} onSuccess={grant => { setReceipt(grant); reload(); }} />
      </div>}
  </MarketPage>;
}
