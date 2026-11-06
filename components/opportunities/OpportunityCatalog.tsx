"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { catalogPaths, isProjectOffer, matchesCatalogSearch, rentalTerm, roleApplicationPath, type Catalog, type OpenRole, type Opportunity, type PaidIntent } from "@/lib/opportunities";
import { formatPrice } from "@/lib/orderPrice";
import { LoadingState, MarketIcon, MarketPage, Notice } from "./MarketUI";
import { useOpportunityData } from "./useOpportunityData";
import styles from "./market.module.css";

const sections = {
  roles: { title: "Open roles", description: "Choose your specialization and apply for free. Each role lists its requirements." },
  rent: { title: "Rent projects", description: "Rent a specific project for a fixed term after qualifying for its specialization." },
  buy: { title: "Full Access projects", description: "Get permanent, exclusive access to a specific project with one payment. Anyone can purchase." },
};

function RoleCard({ role, ready, signedIn }: { role: OpenRole; ready: boolean; signedIn: boolean }) {
  const href = roleApplicationPath(role);
  return <article className={styles.card}>
    <span className={styles.category}><MarketIcon name="work" />{role.category || "Specialization"}</span>
    <h2 className={styles.tileTitle}>{role.title}</h2>
    {role.description && <p className={styles.excerpt}>{role.description}</p>}
    {role.requirements && <details className={styles.requirements}><summary>Role requirements</summary><p className={styles.longText}>{role.requirements}</p></details>}
    {ready && href && <div className={styles.cardFoot}><Link className={styles.primary} href={signedIn ? href : "/login?next=" + encodeURIComponent(href)}>Apply for free <MarketIcon name="arrow" size={16} /></Link></div>}
  </article>;
}

function ProjectCard({ item, type, signedIn }: { item: Opportunity; type: PaidIntent; signedIn: boolean }) {
  const rental = type === "rent";
  return <article className={styles.card}>
    <div className={styles.cardMeta}><span className={styles.category}><MarketIcon name="work" />{item.workPositionTitle}</span></div>
    <h2 className={styles.tileTitle}><Link className={styles.cardTitle} href={`/opportunities/${item._id}?mode=${type}`}>{item.projectTitle || item.title}</Link></h2>
    <p className={styles.excerpt}>{item.description}</p>
    <div className={styles.cardFoot}>
      <p><strong>{formatPrice(rental ? item.rentPrice : item.buyPrice, item.currency)}</strong> · {rental ? rentalTerm(item.rentalDays) : "Permanent access"}</p>
      {item.availability === "rented" ? <p className={styles.subtle}>Currently rented</p> : rental && <p className={styles.subtle}>{signedIn && item.canRent ? "You qualify to rent" : "Specialization approval required"}</p>}
      <Link className={styles.textLink} href={`/opportunities/${item._id}?mode=${type}`}>View project <MarketIcon name="arrow" size={16} /></Link>
    </div>
  </article>;
}

export default function OpportunityCatalog({ view }: { view: Catalog }) {
  const params = useSearchParams();
  const { ready, token } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(params.get("category") || "");
  const roleId = params.get("role");
  const roles = useOpportunityData<OpenRole[]>(view === "roles" ? "/api/work-positions" : null);
  const projects = useOpportunityData<{ opportunities: Opportunity[] }>(view !== "roles" && ready ? "/api/opportunities" : null, token);
  const isRoles = view === "roles";
  const state = isRoles ? roles.state : projects.state;
  const roleRows = roles.state.phase === "loaded" && Array.isArray(roles.state.data) ? roles.state.data.filter(role => roleApplicationPath(role)) : null;
  const offers = projects.state.phase === "loaded" && Array.isArray(projects.state.data.opportunities) ? projects.state.data.opportunities.filter(item =>
    isProjectOffer(item) && item.status === "published" && item.availability !== "sold" && (view === "rent" ? item.rentEnabled : item.buyEnabled)) : null;
  const rows = isRoles ? roleRows : offers;
  const categories = [...new Set((rows || []).map(row => row.category).filter(Boolean))].sort();
  const shownRoles = (roleRows || []).filter(row => (!roleId || row._id === roleId) && (!category || row.category === category) &&
    matchesCatalogSearch([row.title, row.category, row.description, row.requirements], search));
  const shownProjects = (offers || []).filter(row => (!category || row.category === category) && matchesCatalogSearch([row.projectTitle, row.title, row.description, row.workPositionTitle, row.category], search));
  const count = isRoles ? shownRoles.length : shownProjects.length;
  const noun = isRoles ? "role" : "project";
  const filtered = Boolean(category || search.trim() || (isRoles && roleId));
  return <MarketPage>
    <header className={styles.hero}><div><h1>{sections[view].title}</h1><p>{sections[view].description}</p></div>
      {token && <Link href="/opportunities/access" className={styles.secondary}><MarketIcon name="folder" /> My project access</Link>}
    </header>
    <nav aria-label="Explore work" className={styles.intentBar}>
      {(Object.keys(sections) as Catalog[]).map(key => <Link key={key} aria-current={view === key ? "page" : undefined} href={catalogPaths[key]}>{sections[key].title}</Link>)}
    </nav>
    <div className={styles.toolbar}><div className={styles.search}><MarketIcon name="search" /><input type="search" aria-label={`Search ${noun}s`} placeholder={`Search ${noun}s`} value={search} onChange={e=>setSearch(e.target.value)} /></div>
      <label className={styles.selectLabel}>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>
        {category && !categories.includes(category) && <option value={category}>{category}</option>}
        {categories.map(option=><option key={option} value={option}>{option}</option>)}</select></label>
    </div>
    {state.phase === "loading" ? <LoadingState label={`Loading ${noun}s…`} /> :
      !rows ? <Notice title={`Could not load ${noun}s`} retry={isRoles ? roles.reload : projects.reload}><p>Check your connection and try again.</p></Notice> :
      !count ? <Notice title={filtered ? `No matching ${noun}s` : isRoles ? "No roles are open" : view === "rent" ? "No rental projects are listed" : "No Full Access projects are listed"}>
        <p>{filtered ? (roleId ? "This specialization may have closed. Browse all open roles to see current openings." : "Try another search or category.") : isRoles ? "Open specializations will appear here when the team starts accepting applications." : "New projects will appear here when they are published."}</p>
        {filtered && (roleId ? <Link className={styles.secondary} href="/open-roles">Browse all open roles</Link> : <button className={styles.secondary} type="button" onClick={()=>{setSearch(""); setCategory("");}}>Clear filters</button>)}
      </Notice> :
      <section aria-label={sections[view].title}><p aria-live="polite" className={styles.resultCount}>{count} {noun}{count === 1 ? "" : "s"}</p>
        <div className={styles.grid}>{isRoles ? shownRoles.map(role=><RoleCard key={role._id} role={role} ready={ready} signedIn={Boolean(token)} />) : shownProjects.map(item=><ProjectCard key={item._id} item={item} type={view} signedIn={Boolean(token)} />)}</div>
      </section>}
  </MarketPage>;
}
