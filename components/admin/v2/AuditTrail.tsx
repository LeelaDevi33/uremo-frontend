"use client";

/**
 * PATCH_66: UX Safety Layer
 * Audit Trail Panel for tracking all admin actions
 */

import { useState } from "react";

interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
  entityType?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
}

interface AuditTrailProps {
  events: AuditEvent[];
  title?: string;
  maxVisible?: number;
  loading?: boolean;
}

export default function AuditTrail({
  events,
  title = "Activity Log",
  maxVisible = 10,
  loading = false,
}: AuditTrailProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleEvents = expanded ? events : events.slice(0, maxVisible);
  const hasMore = events.length > maxVisible;

  if (loading) {
    return (
      <div className="bg-[#0a0d14] border border-white/5 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>Log</span> {title}
        </h3>
        <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
          Loading history...
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-[#0a0d14] border border-white/5 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>Log</span> {title}
        </h3>
        <p className="text-slate-400 text-sm py-4 text-center">
          No activity recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0d14] border border-white/5 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span>Log</span> {title}
        <span className="ml-auto text-xs text-slate-400">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </h3>

      <div className="space-y-1">
        {visibleEvents.map((event, idx) => (
          <AuditEventRow
            key={event.id}
            event={event}
            isLast={idx === visibleEvents.length - 1}
          />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? "Show less" : `Show ${events.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}

function AuditEventRow({
  event,
  isLast,
}: {
  event: AuditEvent;
  isLast: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const actionIcons: Record<string, string> = {
    create: "+",
    update: "Edit",
    delete: "Del",
    approve: "OK",
    reject: "No",
    assign: "Link",
    suspend: "Hold",
    credit: "Cr",
    debit: "Db",
    verify: "✓",
    login: "Auth",
    default: "Log",
  };

  const getIcon = () => {
    for (const [key, icon] of Object.entries(actionIcons)) {
      if (event.action.toLowerCase().includes(key)) return icon;
    }
    return actionIcons.default;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
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
  };

  return (
    <div className="group">
      <div
        className={`flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
          showDetails ? "bg-white/5" : ""
        }`}
        onClick={() => event.details && setShowDetails(!showDetails)}
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="text-sm">{getIcon()}</span>
          {!isLast && <div className="w-px h-full bg-white/10 mt-1" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-white font-medium truncate">
              {event.action}
            </span>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {formatTime(event.timestamp)}
            </span>
          </div>
          <div className="text-xs text-slate-400 truncate">
            by {event.actor}
          </div>
        </div>

        {/* Expand indicator */}
        {event.details && (
          <span className="text-slate-600 group-hover:text-slate-400 text-xs">
            {showDetails ? "▼" : "▶"}
          </span>
        )}
      </div>

      {/* Details panel */}
      {showDetails && event.details && (
        <div className="ml-8 mb-2 p-3 bg-white/5 border border-white/10 rounded-lg text-xs">
          <div className="text-slate-400">{event.details}</div>
          {(event.oldValue || event.newValue) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {event.oldValue && (
                <div>
                  <span className="text-red-400">Before:</span>
                  <pre className="mt-1 text-slate-400 overflow-auto">
                    {typeof event.oldValue === "object"
                      ? JSON.stringify(event.oldValue, null, 2)
                      : String(event.oldValue)}
                  </pre>
                </div>
              )}
              {event.newValue && (
                <div>
                  <span className="text-emerald-400">After:</span>
                  <pre className="mt-1 text-slate-400 overflow-auto">
                    {typeof event.newValue === "object"
                      ? JSON.stringify(event.newValue, null, 2)
                      : String(event.newValue)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to convert backend activity logs to AuditEvent format
export function parseActivityLog(logs: any[]): AuditEvent[] {
  if (!Array.isArray(logs)) return [];

  return logs.map((log, idx) => ({
    id: log._id || `log-${idx}`,
    action: log.type || log.action || "Unknown action",
    actor: log.by || log.actor || log.adminId || "System",
    timestamp: log.createdAt || log.timestamp || new Date().toISOString(),
    details: log.description || log.details || log.message,
    entityType: log.entityType,
    entityId: log.entityId,
    oldValue: log.oldValue,
    newValue: log.newValue,
  }));
}
