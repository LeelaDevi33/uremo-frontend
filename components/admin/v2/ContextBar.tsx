"use client";

/**
 * PATCH_63: MASTER ADMIN REBUILD
 * ContextBar - Top bar showing current entity and available actions
 */

import { usePathname } from "next/navigation";
import Link from "next/link";

interface ContextBarProps {
  menuButton?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function ContextBar({
  menuButton,
  title,
  subtitle,
  actions,
  breadcrumbs,
}: ContextBarProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if not provided
  const autoBreadcrumbs = breadcrumbs || generateBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 bg-[#0a0d14]/95 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left: Breadcrumbs + Title */}
        <div className="flex items-center gap-4 min-w-0">
          {menuButton}
          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1.5 text-sm">
            {autoBreadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-slate-600">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-slate-400 hover:text-white transition-colors truncate max-w-[150px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white font-medium truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>

          {/* Mobile: Just show title */}
          <div className="sm:hidden">
            {title && (
              <h1 className="text-white font-semibold truncate">{title}</h1>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {actions}

          {/* Quick Actions Dropdown */}
          <QuickActionsMenu />
        </div>
      </div>

      {/* Subtitle row (optional) */}
      {subtitle && (
        <div className="px-4 lg:px-6 pb-2 text-sm text-slate-500">
          {subtitle}
        </div>
      )}
    </header>
  );
}

function QuickActionsMenu() {
  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
        <span>+</span>
        <span className="hidden sm:inline">Quick Action</span>
      </button>

      <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-[#12151e] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all">
        <Link
          href="/admin/opportunities"
          className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          Manage opportunities
        </Link>
        <Link
          href="/admin/work-positions"
          className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          Add Job Role
        </Link>
        <Link
          href="/admin/workspace/screenings"
          className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          Add Screening
        </Link>
        <Link
          href="/admin/blogs"
          className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          Add Blog Post
        </Link>
        <div className="border-t border-white/5 my-1" />
        <Link
          href="/admin/tickets"
          className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          View Open Tickets
        </Link>
      </div>
    </div>
  );
}

function generateBreadcrumbs(
  pathname: string | null,
): { label: string; href?: string }[] {
  if (!pathname) return [{ label: "Admin" }];

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href?: string }[] = [];

  const labelMap: Record<string, string> = {
    admin: "Admin",
    orders: "Orders",
    workspace: "Workspace",
    master: "Master",
    screenings: "Screenings",
    projects: "Projects",
    workers: "Workers",
    workforce: "Workforce",
    proofs: "Proofs",
    tickets: "Tickets",
    services: "Services",
    rentals: "Rentals",
    blogs: "Blogs",
    wallet: "Wallets",
    affiliates: "Affiliates",
    payments: "Payments",
    analytics: "Analytics",
    jarvisx: "JarvisX",
    settings: "Settings",
    users: "Users",
    campaigns: "Campaigns",
    messages: "Messages",
    "work-positions": "Job Roles",
    "service-requests": "Service Requests",
  };

  let path = "";
  segments.forEach((segment, idx) => {
    path += `/${segment}`;
    const label =
      labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    if (idx === segments.length - 1) {
      breadcrumbs.push({ label });
    } else {
      breadcrumbs.push({ label, href: path });
    }
  });

  return breadcrumbs;
}
