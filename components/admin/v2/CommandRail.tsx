"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminToolGroups, adminToolForPath } from "./adminNavigation";
import type { BadgeCounts } from "./AdminLayoutV2";

interface CommandRailProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  badges: BadgeCounts;
}

function watchHash(update: () => void) {
  // Next links use pushState. Link clicks and history navigation can both change an anchor.
  function afterClick() { requestAnimationFrame(update); }
  window.addEventListener("click", afterClick);
  window.addEventListener("hashchange", update);
  window.addEventListener("popstate", update);
  return () => {
    window.removeEventListener("click", afterClick);
    window.removeEventListener("hashchange", update);
    window.removeEventListener("popstate", update);
  };
}

export default function CommandRail({ collapsed, onToggle, mobileOpen, onCloseMobile, badges }: CommandRailProps) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(watchHash, () => window.location.hash, () => "");
  const tool = adminToolForPath(pathname);
  const group = adminToolGroups.find(group => group.tools.includes(tool!));
  const activeAnchor = group?.tools.find(link => link.href === pathname + hash);
  const activeHref = activeAnchor?.href ?? tool?.href;
  const [chosen, setChosen] = useState<{ path: string; id: string | null } | null>(null);
  const open = chosen?.path === pathname ? chosen.id : group?.id ?? "market";
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visible = adminToolGroups.map(group => ({ ...group, tools: group.tools.filter(tool =>
    (group.label + " " + tool.label).toLowerCase().includes(query)) })).filter(group => group.tools.length);

  function navigate() {
    setChosen(null);
    setSearch("");
    if (mobileOpen) onCloseMobile();
  }

  return <aside id="admin-navigation" aria-label="Admin navigation" role={mobileOpen ? "dialog" : undefined}
    aria-modal={mobileOpen || undefined} className={`fixed inset-y-0 left-0 z-50 flex-col border-r border-emerald-100/10 bg-[#10251e] text-slate-100 lg:flex ${mobileOpen ? "flex" : "hidden"} ${collapsed ? "w-16" : "w-64 max-w-[90vw]"}`}>
    <div className="flex min-h-16 items-center justify-between gap-2 border-b border-emerald-100/10 px-3">
      {!collapsed && <Link href="/admin" onClick={navigate} aria-label="UREMO admin dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
        <span>UREMO</span><span className="text-sm font-normal text-emerald-100/70">Admin</span></Link>}
      <button type="button" onClick={onToggle} aria-label={collapsed ? "Expand admin navigation" : "Collapse admin navigation"}
        title={collapsed ? "Expand admin navigation" : "Collapse admin navigation"} className="mx-auto hidden size-9 items-center justify-center rounded-md text-emerald-100 hover:bg-white/10 lg:flex">{collapsed ? "→" : "←"}</button>
      <button type="button" aria-label="Close admin navigation" onClick={onCloseMobile} className="rounded-md px-3 py-2 text-sm text-emerald-100 lg:hidden">Close</button>
    </div>
    <nav aria-label="Admin tools" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
      <Link href="/admin" aria-label="Dashboard" title="Dashboard" aria-current={pathname === "/admin" ? "page" : undefined} onClick={navigate}
        className={`mb-3 flex items-center rounded-md px-2.5 py-2.5 text-sm font-semibold ${pathname === "/admin" ? "bg-emerald-100/15 text-white" : "text-emerald-50 hover:bg-white/10"}`}>{collapsed ? "Home" : "Dashboard"}</Link>
      {!collapsed && <input type="search" aria-label="Find admin tools" placeholder="Find a tool…" value={search} onChange={event => setSearch(event.target.value)}
        className="mb-3 w-full rounded-md border border-emerald-100/25 bg-[#10251e] px-3 py-2 text-sm text-white placeholder:text-emerald-50/65" />}
      {(collapsed ? adminToolGroups : visible).map(section => {
        const expanded = !collapsed && (Boolean(query) || open === section.id);
        return <div key={section.id} className="mb-1">
          {query && !collapsed ? <p className="px-2.5 py-2 text-xs text-emerald-100/70">{section.label}</p> :
            <button type="button" aria-label={section.label} title={section.label} aria-expanded={expanded} aria-controls={`admin-group-${section.id}`}
              onClick={() => { if (collapsed) onToggle(); setChosen({ path: pathname, id: expanded ? null : section.id }); }}
              className={`flex w-full items-center justify-between gap-1 rounded-md px-2.5 py-2.5 text-left text-sm font-medium hover:bg-white/10 ${group?.id === section.id ? "text-white" : "text-emerald-50/85"}`}>
              {collapsed ? section.shortLabel : section.label}{!collapsed && <span aria-hidden="true" className="text-emerald-100/60">{expanded ? "−" : "+"}</span>}
            </button>}
          <div id={`admin-group-${section.id}`} hidden={!expanded} className="ml-3 border-l border-emerald-200/20 pl-2">
            {section.tools.map(item => {
              const count = item.badge && badges[item.badge];
              return <Link key={item.href} href={item.href} onClick={navigate} aria-current={item.href === activeHref ? "page" : undefined}
                className={`my-0.5 flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm ${item.href === activeHref ? "bg-emerald-100/15 font-semibold text-white" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"}`}>
                {item.label}{Boolean(count) && <span className="rounded bg-emerald-100/15 px-1.5 text-xs tabular-nums">{count}</span>}
              </Link>;
            })}
          </div>
        </div>;
      })}
      {!collapsed && visible.length === 0 && <p role="status" className="px-2 py-3 text-sm text-emerald-50/80">No tools match your search.</p>}
    </nav>
    <Link href="/" aria-label="View marketplace" title="View marketplace" onClick={navigate} className="border-t border-white/10 py-4 text-center text-sm text-emerald-50 hover:bg-white/10">{collapsed ? "Site ↗" : "View marketplace ↗"}</Link>
  </aside>;
}
