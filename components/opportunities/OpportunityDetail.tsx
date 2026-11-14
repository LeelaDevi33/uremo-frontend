"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { availableFor, catalogPaths, isProjectOffer, rentalTerm, type Opportunity, type PaidIntent } from "@/lib/opportunities";
import { formatPrice } from "@/lib/orderPrice";
import { LoadingState, MarketIcon, MarketPage, Notice } from "./MarketUI";
import WalletConfirmation from "./WalletConfirmation";
import { useOpportunityData } from "./useOpportunityData";
import styles from "./market.module.css";

function ProjectOptions({ item, mode, token, refresh }: { item: Opportunity; mode?: PaidIntent; token: string | null; refresh: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<PaidIntent | null>(null);
  const types = (["rent", "buy"] as const).filter(type => type === "rent" ? item.rentEnabled : item.buyEnabled);
  return <aside className={styles.options} aria-labelledby="access-options">
    <h2 id="access-options">Project access</h2>
    {item.availability === "sold" || item.availability === "rented" ? <div>
      <p className={styles.closed}>{item.availability === "sold" ? "Full Access has already been purchased." : "This project is currently rented."}</p>
      {token && <Link className={styles.textLink} href="/opportunities/access">My project access</Link>}
    </div> :
      !types.length ? <p className={styles.closed}>This project has no current offer.</p> :
      types.map(type => {
        const rent = type === "rent";
        const permitted = rent ? item.canRent === true : item.canBuy === true;
        return <section key={type} className={styles.option}>
          <div className={styles.optionName}><MarketIcon name={type} /><h3>{rent ? "Rent project" : "Full Access"}</h3><strong>{formatPrice(rent ? item.rentPrice : item.buyPrice, item.currency)}</strong></div>
          <p>{rent ? `Exclusive access for ${rentalTerm(item.rentalDays)}. Requires qualification in ${item.workPositionTitle}.` : "One payment gives you permanent, exclusive access to this project. Anyone can purchase."}</p>
          {!availableFor(item, type) ? <p className={styles.closed}>These terms are currently unavailable.</p> :
            !token ? <Link className={styles.secondary} href={"/login?next=" + encodeURIComponent(`/opportunities/${item._id}?mode=${type}`)}>{rent ? "Sign in to check rental eligibility" : "Sign in for Full Access"}</Link> :
            !permitted ? rent ? <div><p>Your account does not currently qualify for this rental.</p><Link className={styles.textLink} href={`/open-roles?role=${item.workPositionId}`}>View specialization <MarketIcon name="arrow" size={15} /></Link></div> : <p className={styles.closed}>Full Access is currently unavailable.</p> :
            selected === type ? <WalletConfirmation item={item} token={token} type={type} onCancel={() => setSelected(null)} onRefresh={refresh}
              onSuccess={grant => router.push(`/profile?grant=${encodeURIComponent(grant._id)}#project-access`)} /> :
            !selected && <button type="button" className={mode === type ? styles.primary : styles.secondary} onClick={() => setSelected(type)}>{rent ? "Review rental" : "Review Full Access"}</button>}
        </section>;
      })}
  </aside>;
}

export default function OpportunityDetail({ id, mode }: { id: string; mode?: PaidIntent }) {
  const { token, ready } = useAuth();
  const validId = /^[a-f\d]{24}$/i.test(id);
  const { state, reload } = useOpportunityData<{ opportunity: Opportunity }>(ready && validId ? `/api/opportunities/${id}` : null, token);
  const missing = !validId || (state.phase === "error" && state.error instanceof ApiError && [403,404].includes(state.error.status));
  const item = state.phase === "loaded" ? state.data.opportunity : null;
  const back = catalogPaths[mode ?? (item?.rentEnabled && !item.buyEnabled ? "rent" : "buy")];
  return <MarketPage>
    <Link href={back} className={styles.textLink}><MarketIcon name="back" />{back === catalogPaths.rent ? "Rent projects" : "Full Access projects"}</Link>
    {missing || (item && !isProjectOffer(item)) ? <Notice title="Project offer unavailable"><p>This offer may have closed. Existing holders can find their handoff in My project access.</p><Link href="/opportunities/access" className={styles.secondary}>My project access</Link></Notice> :
      !ready || state.phase === "loading" ? <LoadingState label="Loading project…" /> :
      !item ? <Notice title="Could not load this project" retry={reload} /> :
      <div className={styles.detailGrid}><article className={styles.description}>
        <span className={styles.category}><MarketIcon name="work" />{item.workPositionTitle}</span><h1>{item.projectTitle || item.title}</h1>
        <div className={styles.rule} /><h2>Project brief</h2><p className={styles.longText}>{item.description}</p>
      </article><ProjectOptions key={item.revision || item._id} item={item} mode={mode} token={token} refresh={reload} /></div>}
  </MarketPage>;
}
