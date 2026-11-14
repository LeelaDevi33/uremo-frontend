"use client";

/**
 * PATCH_63: MASTER ADMIN REBUILD
 * Reusable Admin UI Components
 */

import Link from "next/link";
import { useState } from "react";

// ================================
// DATA TABLE
// ================================
interface Column<T> {
  key: string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  expandedRow?: (item: T) => React.ReactNode;
  rowClassName?: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = "No data found",
  rowKey,
  onRowClick,
  expandedRow,
  rowClassName,
}: DataTableProps<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="p-8 text-center text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((item, idx) => {
            const id = rowKey(item);
            const isExpanded = expandedId === id;

            return (
              <>
                <tr
                  key={id}
                  onClick={() => {
                    if (expandedRow) {
                      setExpandedId(isExpanded ? null : id);
                    }
                    onRowClick?.(item);
                  }}
                  className={`hover:bg-white/5 transition-colors ${
                    onRowClick || expandedRow ? "cursor-pointer" : ""
                  } ${rowClassName?.(item) || ""}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-300">
                      {col.render
                        ? col.render(item, idx)
                        : String((item as any)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
                {isExpanded && expandedRow && (
                  <tr key={`${id}-expanded`} className="bg-white/5">
                    <td colSpan={columns.length} className="px-4 py-4">
                      {expandedRow(item)}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ================================
// STATUS BADGE
// ================================
interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  payment_pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  payment_submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  waiting_user: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  open: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  closed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  applied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ready_to_work: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  working: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const style =
    statusStyles[status.toLowerCase()] ||
    "bg-slate-500/20 text-slate-400 border-slate-500/30";
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded border font-medium ${style} ${sizeClass}`}
    >
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

// ================================
// ACTION BUTTON
// ================================
interface ActionButtonProps {
  onClick: () => void;
  variant?: "primary" | "success" | "danger" | "warning" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white border-blue-500",
  success:
    "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30",
  danger: "bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30",
  warning:
    "bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-amber-500/30",
  ghost: "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10",
};

export function ActionButton({
  onClick,
  variant = "ghost",
  size = "sm",
  disabled,
  loading,
  children,
}: ActionButtonProps) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg border font-medium transition-colors
                 ${variantStyles[variant]} ${sizeClass}
                 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {loading && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

// ================================
// STAT CARD
// ================================
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: { value: number; label: string };
  color?: "blue" | "emerald" | "amber" | "red" | "purple";
  href?: string;
}

const colorStyles = {
  blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
  amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
  red: "from-red-500/10 to-red-500/5 border-red-500/20",
  purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = "blue",
  href,
}: StatCardProps) {
  const content = (
    <div
      className={`rounded-xl bg-gradient-to-br ${colorStyles[color]} border p-4 transition-transform hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-sm text-slate-400 mt-1">{label}</div>
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      {trend && (
        <div
          className={`mt-2 text-xs ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// ================================
// FILTER BAR
// ================================
interface FilterOption {
  key: string;
  label: string;
  count?: number;
  icon?: string;
  alert?: boolean;
}

interface FilterBarProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterBar({ options, value, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                       ${
                         active
                           ? opt.alert
                             ? "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                             : "bg-blue-500/20 border border-blue-500/30 text-blue-300"
                           : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                       }`}
          >
            {opt.icon && <span>{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && opt.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  opt.alert ? "bg-amber-500/30 text-amber-300" : "bg-white/10"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ================================
// SECTION HEADER
// ================================
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  actions,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ================================
// CARD CONTAINER
// ================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div
      className={`bg-[#0a0d14] border border-white/5 rounded-xl ${padding ? "p-4" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ================================
// EMPTY STATE
// ================================
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon = "Info",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-slate-400 text-sm mb-4">{description}</p>
      )}
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

// ================================
// TIMELINE
// ================================
interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status?: "success" | "warning" | "error" | "info";
  icon?: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

const timelineStatusStyles = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return <div className="text-slate-400 text-sm">No timeline events</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-2.5 h-2.5 rounded-full ${timelineStatusStyles[item.status || "info"]}`}
            />
            {idx < items.length - 1 && (
              <div className="w-0.5 flex-1 bg-white/10 mt-1" />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">
                {item.title}
              </span>
              <span className="text-slate-400 text-xs">
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
            {item.description && (
              <p className="text-slate-400 text-sm mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ================================
// WARNING BANNER
// ================================
interface WarningBannerProps {
  type: "warning" | "error" | "info";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const bannerStyles = {
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  error: "bg-red-500/10 border-red-500/30 text-red-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

export function WarningBanner({
  type,
  title,
  description,
  action,
}: WarningBannerProps) {
  const icons = {
    warning: "!",
    error: "!",
    info: "ℹ️",
  };

  return (
    <div className={`rounded-xl border p-4 ${bannerStyles[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">
          <div className="font-medium">{title}</div>
          {description && (
            <p className="text-sm opacity-80 mt-1">{description}</p>
          )}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="px-3 py-1.5 rounded-lg border border-current text-sm font-medium hover:bg-white/5 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
