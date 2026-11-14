"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { catalogPaths, matchesCatalogSearch, roleApplicationPath, type OpenRole } from "@/lib/opportunities";
import { MarketIcon } from "./MarketUI";
import { useOpportunityData } from "./useOpportunityData";
import styles from "./roles.module.css";

const experienceLabels = { entry: "Entry level", intermediate: "Intermediate", advanced: "Advanced" };
const workModeLabels = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const labelCategory = (raw: string) => raw.replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase());

function BoardHeader() {
  const { data: { marketplace } } = useSiteSettings();
  return <>
    <header className={styles.masthead}>
      <div className={styles.intro}>
        <h1>{marketplace.rolesTitle}</h1>
        <p>{marketplace.rolesIntro}</p>
      </div>
      <div aria-hidden="true" className={styles.photograph} />
    </header>
    <nav className={styles.sections} aria-label="Explore work">
      <Link aria-current="page" href={catalogPaths.roles}>Open roles</Link>
      <Link href={catalogPaths.rent}>Rent projects</Link>
      <Link href={catalogPaths.buy}>Full Access projects</Link>
    </nav>
  </>;
}

export function BoardLoading() {
  return <div className={styles.page}><div className={styles.container}>
    <BoardHeader /><div className={styles.state} role="status">Loading roles…</div>
  </div></div>;
}

function DisciplineMark({ category }: { category: string }) {
  const key = category.trim().toLowerCase();
  const letter = key.charAt(0).toUpperCase();
  const icon = key === "development" || key === "coding" ? <><path d="m7.5 8-4 4 4 4m9-8 4 4-4 4m-3.8-11-2.4 14" /></> :
    key === "research" ? <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m14.5 14.5 5 5M8 10.5h5" /></> :
    key === "writing" ? <><path d="m5 15 9.7-9.7a2.3 2.3 0 0 1 3.3 3.3L8.3 18.3 4 19l1-4Zm8.4-8.4 3.4 3.4M12 19h8" /></> :
    key === "design" ? <><path d="M8 4h8l4 7-8 9-8-9 4-7Zm-4 7h16m-8 9-3-9 3-7 3 7-3 9Z" /></> : null;
  return <span className={styles.disciplineMark} aria-hidden="true" data-color={key === "research" || key === "design" ? "iris" : key === "writing" ? "ochre" : "fern"}>
    {icon ? <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icon}</svg> : letter || "·"}
  </span>;
}

function RoleRow({ role, opened, ready, signedIn, canEdit, onToggle }: {
  role: OpenRole; opened: boolean; ready: boolean; signedIn: boolean; canEdit: boolean; onToggle: () => void;
}) {
  const href = roleApplicationPath(role)!;
  const category = labelCategory(role.category || "Specialization");
  const experience = role.experienceLevel ? experienceLabels[role.experienceLevel] : "";
  const mode = role.workMode ? workModeLabels[role.workMode] : "";
  const requirements = (role.requirements || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const skills = role.skills || [];
  const responsibilities = role.responsibilities || [];
  const detailsId = `role-brief-${role._id}`;
  const rowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (opened && rowRef.current && rowRef.current.getBoundingClientRect().top < 60) {
      rowRef.current.scrollIntoView({ block: "start" });
    }
  }, [opened]);

  return <article className={styles.row} id={`role-${role._id}`} data-open={opened} ref={rowRef}>
    <div className={styles.rowTop}>
      <DisciplineMark category={role.category || ""} />
      <div className={styles.identity}>
        <p className={styles.discipline}>{category}</p>
        <h3>{role.title}</h3>
      </div>
      <div className={styles.actions}>
        {ready && <Link className={styles.apply} href={signedIn ? href : "/login?next=" + encodeURIComponent(href)}>Apply for free <MarketIcon name="arrow" size={15} /></Link>}
      </div>
    </div>
    {role.description && <p className={styles.summary} data-expanded={opened}>{role.description}</p>}
    <div className={styles.rowFoot}>
      <ul aria-label="Role facts" className={styles.facts}>
        {mode && <li>{mode}</li>}
        {role.locationEligibility && <li>{role.locationEligibility}</li>}
        {experience && <li>{experience}</li>}
        {role.timeCommitment && <li>{role.timeCommitment}</li>}
      </ul>
      <button type="button" aria-label={`${opened ? "Hide" : "View"} brief for ${role.title}`} className={styles.detailsToggle} onClick={onToggle} aria-expanded={opened} aria-controls={detailsId}>
        {opened ? "Hide brief" : "View brief"}<span aria-hidden="true">{opened ? "−" : "+"}</span>
      </button>
    </div>
    <div id={detailsId} hidden={!opened} className={styles.detail}>
      {responsibilities.length > 0 && <section><h4>What you’ll do</h4><ul>{responsibilities.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
      {requirements.length > 0 && <section><h4>What you’ll need</h4><ul>{requirements.map((line, index) => <li key={index}>{line}</li>)}</ul></section>}
      {skills.length > 0 && <section><h4>Skills</h4><p className={styles.skillList}>{skills.map((skill, index) => <span key={index}>{skill}</span>)}</p></section>}
      <section><h4>Application</h4><p>Submit your application for review.{role.hasScreening === true ? " This role includes a screening." : ""}</p></section>
      {canEdit && <Link className={styles.adminEdit} href={`/admin/work-positions?edit=${role._id}`}>Edit role <MarketIcon name="apply" size={14} /></Link>}
    </div>
  </article>;
}

export default function OpenRolesBoard() {
  const params = useSearchParams();
  const { token, user, ready } = useAuth();
  const { state, reload } = useOpportunityData<OpenRole[]>("/api/work-positions");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(params.get("category") || "");
  const [experience, setExperience] = useState("");
  const [mode, setMode] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const roleId = params.get("role");
  const rows = state.phase === "loaded" && Array.isArray(state.data) ? state.data.filter(role => role && role.title && roleApplicationPath(role)) : [];
  const selected = rows.find(role => role._id === roleId);
  const categories = [...new Set(rows.map(role => role.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const experienceChoices = Object.entries(experienceLabels).filter(([key]) => rows.some(role => role.experienceLevel === key));
  const workModes = Object.entries(workModeLabels).filter(([key]) => rows.some(role => role.workMode === key));
  const shown = rows.filter(role => (!category || role.category === category) && (!experience || role.experienceLevel === experience) &&
    (!mode || role.workMode === mode) && matchesCatalogSearch([role.title, role.category, role.description, role.requirements, role.locationEligibility,
      role.timeCommitment, role.experienceLevel && experienceLabels[role.experienceLevel], role.workMode && workModeLabels[role.workMode],
      ...(role.skills || []), ...(role.responsibilities || [])], search));
  const count = shown.length;
  const filterCount = [category, experience, mode].filter(Boolean).length;
  const filtered = filterCount > 0 || Boolean(search.trim());
  const failed = state.phase === "error" || (state.phase === "loaded" && !Array.isArray(state.data));

  function brief(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("role", id); else url.searchParams.delete("role");
    window.history.pushState(null, "", url.pathname + url.search);
  }

  function reset() {
    setSearch(""); setCategory(""); setExperience(""); setMode("");
    const url = new URL(window.location.href);
    url.searchParams.delete("role");
    url.searchParams.delete("category");
    window.history.replaceState(null, "", url.pathname + url.search);
  }

  const focusId = useRef<string | null>(null);
  useEffect(() => {
    if (!selected) { focusId.current = null; return; }
    if (focusId.current === selected._id) return;
    focusId.current = selected._id;
    const el = document.getElementById(`role-${selected._id}`);
    if (el && el.getBoundingClientRect().top > window.innerHeight * .8) el.scrollIntoView({ block: "start" });
  }, [selected]);

  return <div className={styles.page}><div className={styles.container}>
    <BoardHeader />
    <section aria-labelledby="directory-heading" className={styles.directory}>
      <div className={styles.directoryTitle}><h2 id="directory-heading">Role directory</h2>
        {state.phase === "loaded" && !failed && <p role="status" className={styles.count}>{filtered ? `${count} of ${rows.length}` : count} {filtered ? "shown" : count === 1 ? "open role" : "open roles"}</p>}
      </div>
      <div className={styles.tools}>
        <label className={styles.search}><MarketIcon name="search" size={19} />
          <input type="search" aria-label="Search roles" placeholder="Search roles or skills" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {categories.length > 0 && <button type="button" className={styles.mobileFilters} aria-controls="role-filters" aria-expanded={mobileFilters} onClick={() => setMobileFilters(!mobileFilters)}>Filters{filterCount ? ` (${filterCount})` : ""}</button>}
        <div id="role-filters" className={styles.filters} data-mobile-open={mobileFilters}>
          {categories.length > 0 && <label>Specialization<select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All specializations</option>{category && !categories.includes(category) && <option value={category}>{labelCategory(category)}</option>}
            {categories.map(key => <option key={key} value={key}>{labelCategory(key)}</option>)}
          </select></label>}
          {experienceChoices.length > 0 && <label>Experience<select value={experience} onChange={e => setExperience(e.target.value)}>
            <option value="">All levels</option>{experienceChoices.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>}
          {workModes.length > 0 && <label>Work mode<select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="">All work modes</option>{workModes.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>}
        </div>
      </div>
      {state.phase === "loading" ? <div className={styles.state} role="status">Loading roles…</div> :
        failed ? <div className={styles.state} role="status"><h3>Roles couldn’t be loaded</h3><p>Check your connection and try again.</p><button onClick={reload} type="button">Try again</button></div> : <>
          {roleId && !selected && <div className={styles.missing} role="status">This role is no longer open. <button type="button" onClick={reset}>Browse available roles</button></div>}
          {!count ? <div className={styles.state} role="status"><h3>{filtered ? "No matching roles" : "No roles are open"}</h3>
            <p>{filtered ? "Try a broader search or clear your filters." : "Check back for new specializations."}</p>
            {filtered && <button onClick={reset} type="button">Clear filters</button>}
          </div> : <div className={styles.rows}>{shown.map(role => <RoleRow key={role._id} role={role} ready={ready} signedIn={Boolean(token)} canEdit={Boolean(ready && token && user?.role === "admin")} opened={role._id === roleId} onToggle={() => brief(role._id === roleId ? null : role._id)} />)}</div>}
        </>}
    </section>
  </div></div>;
}
