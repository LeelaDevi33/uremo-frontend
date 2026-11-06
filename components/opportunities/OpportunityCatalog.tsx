"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { availableFor, filteredOpportunities, readIntent, rentalTerm, type Intent, type Opportunity } from "@/lib/opportunities";
import { formatPrice } from "@/lib/orderPrice";
import { LoadingState, MarketIcon, MarketPage, Notice } from "./MarketUI";
import { useOpportunityData } from "./useOpportunityData";
import styles from "./market.module.css";

const intents: { value: Intent; label: string }[] = [
  { value: "all", label: "All opportunities" }, { value: "apply", label: "Apply" },
  { value: "rent", label: "Rent" }, { value: "buy", label: "Buy outright" },
];

function intentHref(intent: Intent) {
  return intent === "all" ? "/explore-services" : `/explore-services?intent=${intent}`;
}

function OpportunityCard({ item }: { item: Opportunity }) {
  const apply = availableFor(item, "apply");
  const rent = availableFor(item, "rent");
  const buy = availableFor(item, "buy");
  return (
    <article className={styles.card}>
      <div className={styles.cardMeta}>
        <span className={styles.category}><MarketIcon name="work" /> {item.category || "Opportunity"}</span>
        {item.availability === "rented" && <span className={styles.status}>Currently rented</span>}
      </div>
      <h3><Link className={styles.cardTitle} href={`/opportunities/${item._id}`}>{item.title}</Link></h3>
      <p className={styles.excerpt}>{item.description}</p>
      <div className={styles.cardFoot}>
        <ul className={styles.terms}>
          {apply && <li><span>Apply</span><strong>Free</strong></li>}
          {rent && <li><span>Rent · {rentalTerm(item.rentalDays)}</span><strong>{formatPrice(item.rentPrice, item.currency)}</strong></li>}
          {buy && <li><span>Buy outright</span><strong>{formatPrice(item.buyPrice, item.currency)}</strong></li>}
          {!apply && !rent && !buy && <li><span>No options currently available</span></li>}
        </ul>
        <span className={styles.arrowDisc} aria-hidden="true"><MarketIcon name="arrow" /></span>
      </div>
    </article>
  );
}

export default function OpportunityCatalog() {
  const params = useSearchParams();
  const intent = readIntent(params.get("intent"));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const { state, reload } = useOpportunityData<{ opportunities: Opportunity[] }>("/api/opportunities");
  const listings = state.phase === "loaded" && Array.isArray(state.data.opportunities) ? state.data.opportunities : null;
  const published = listings ? filteredOpportunities(listings, "all", "", "") : [];
  const categories = [...new Set(published.map(item => item.category).filter(Boolean))].sort();
  const results = filteredOpportunities(published, intent, category, search);

  return (
    <MarketPage>
      <header className={styles.hero}>
        <div><h1>Explore opportunities</h1><p>Find an open role, rent time-limited access, or buy an opportunity outright.</p></div>
        <Link href="/opportunities/access" className={styles.secondary}><MarketIcon name="folder" /> My access</Link>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <MarketIcon name="search" />
          <input aria-label="Search opportunities" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search opportunities" />
        </div>
        <label className={styles.selectLabel}>
          <span>Category</span>
          <select value={category} onChange={event => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map(value => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <nav className={styles.intentBar} aria-label="Opportunity options">
        {intents.map(({ value, label }) => <Link
          key={value} href={intentHref(value)} prefetch={false}
          onNavigate={event => {
            event.preventDefault();
            if (value !== intent) window.history.pushState(null, "", intentHref(value));
          }}
          aria-current={intent === value ? "page" : undefined}
        >{label}</Link>)}
      </nav>
      {state.phase === "loading" ? <LoadingState label="Loading opportunities…" /> :
        !listings ? <Notice title="Opportunities could not be loaded" retry={reload}><p>Check your connection and try again.</p></Notice> :
        !published.length ? <Notice title="No opportunities have been published"><p>New listings will appear here when they open.</p></Notice> :
        !results.length ? <Notice title="No matching opportunities">
          <p>Try another search, category, or access option.</p>
          <Link className={styles.secondary} href="/explore-services" prefetch={false} onNavigate={event => {
            event.preventDefault();
            setSearch(""); setCategory("");
            if (intent !== "all") window.history.pushState(null, "", intentHref("all"));
          }}>Clear filters</Link>
        </Notice> :
        <section aria-labelledby="catalog-results-title">
          <h2 className={styles.resultCount} id="catalog-results-title" aria-live="polite">{results.length} {results.length === 1 ? "opportunity" : "opportunities"}</h2>
          <div className={styles.grid}>{results.map(item => <OpportunityCard key={item._id} item={item} />)}</div>
        </section>
      }
    </MarketPage>
  );
}
