"use client";

/**
 * PATCH_66: UX Safety Layer
 * Persistent Action Bar for entity pages
 */

import { useState } from "react";

interface ActionBarButton {
  key: string;
  label: string;
  icon?: string;
  variant?: "primary" | "success" | "danger" | "warning" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  onClick: () => void;
}

interface ActionBarProps {
  actions: ActionBarButton[];
  sticky?: boolean;
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

export default function ActionBar({ actions, sticky = true }: ActionBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 p-3 bg-[#0a0d14]/95 backdrop-blur-sm border border-white/10 rounded-xl ${
        sticky ? "sticky top-4 z-30" : ""
      }`}
    >
      <span className="mr-2 text-xs text-slate-400">Actions:</span>
      {actions.map((action) => {
        const { key, ...actionProps } = action;
        return <ActionButton key={key} {...actionProps} />;
      })}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  variant = "ghost",
  disabled,
  loading,
  tooltip,
  onClick,
}: ActionBarButton) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
          ${variantStyles[variant]}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span>{icon}</span>
        ) : null}
        {label}
      </button>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 whitespace-nowrap shadow-xl z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
