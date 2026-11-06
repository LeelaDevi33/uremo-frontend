"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiAnalytics } from "@/components/ui/Emoji";

interface Stats {
  totalUsers: number;
  newUsersToday: number;
  totalOrders: number;
  completedOrders: number;
  processingOrders: number;
  pendingOrders: number;
  ordersToday: number;
  totalRevenue: number;
  totalWalletVolume: number;
  pendingTickets: number;
  openTickets: number;
  activeRentals: number;
  totalRentals: number;
  affiliateEarnings: number;
  totalServices: number;
}

interface ChartData {
  ordersPerDay: { _id: string; count: number }[];
  revenuePerDay: { _id: string; total: number }[];
  usersPerDay: { _id: string; count: number }[];
  ticketsPerDay: { _id: string; count: number }[];
}

interface SystemHealth {
  database: string;
  uptime: number;
  uptimeFormatted: string;
  memory: { heapUsed: number; heapTotal: number; rss: number };
  recentFailedOrders: number;
  serverTime: string;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { ready, user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState(30);

  // Auth check
  useEffect(() => {
    if (ready && (!isAuthenticated || user?.role !== "admin")) {
      router.push("/login");
    }
  }, [ready, isAuthenticated, user, router]);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, chartsRes, healthRes] = await Promise.all([
        apiRequest<any>("/api/admin/analytics/dashboard", "GET", null, true),
        apiRequest<any>(
          `/api/admin/analytics/charts?days=${chartDays}`,
          "GET",
          null,
          true,
        ),
        apiRequest<any>("/api/admin/analytics/health", "GET", null, true),
      ]);

      if (statsRes.ok) setStats(statsRes.stats);
      if (chartsRes.ok) setCharts(chartsRes);
      if (healthRes.ok) setHealth(healthRes.health);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      loadData();
    }
  }, [isAuthenticated, user, chartDays]);

  if (!ready || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    `$${(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            title="Analytics Dashboard"
            emoji={<EmojiAnalytics />}
            description="Historical orders, account activity and service health"
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 rounded-lg text-sm font-medium transition"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* System Health */}
        {health && (
          <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-3 h-3 rounded-full ${health.database === "connected" ? "bg-emerald-400" : "bg-red-400"}`}
              />
              <h2 className="font-semibold">System Health</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Database</p>
                <p
                  className={
                    health.database === "connected"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {health.database}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Uptime</p>
                <p>{health.uptimeFormatted}</p>
              </div>
              <div>
                <p className="text-gray-400">Memory (Heap)</p>
                <p>
                  {health.memory.heapUsed}MB / {health.memory.heapTotal}MB
                </p>
              </div>
              <div>
                <p className="text-gray-400">RSS Memory</p>
                <p>{health.memory.rss}MB</p>
              </div>
              <div>
                <p className="text-gray-400">Failed Orders (1h)</p>
                <p
                  className={
                    health.recentFailedOrders > 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                >
                  {health.recentFailedOrders}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              subtitle={`+${stats.newUsersToday} today`}
              icon="👥"
              color="blue"
            />
            <StatCard
              title="Historical orders"
              value={stats.totalOrders}
              subtitle={`+${stats.ordersToday} today`}
              icon="📦"
              color="purple"
            />
            <StatCard
              title="Legacy order revenue"
              value={formatCurrency(stats.totalRevenue)}
              subtitle={`${stats.completedOrders} completed`}
              icon="💰"
              color="green"
            />
            <StatCard
              title="Wallet Volume"
              value={formatCurrency(stats.totalWalletVolume)}
              subtitle="Total credits"
              icon="💳"
              color="cyan"
            />
            <StatCard
              title="In Progress Orders"
              value={stats.processingOrders}
              subtitle={`${stats.pendingOrders} pending payment`}
              icon="⚡"
              color="amber"
            />
            <StatCard
              title="Open Tickets"
              value={stats.openTickets}
              subtitle={`${stats.pendingTickets} awaiting response`}
              icon="🎫"
              color="pink"
            />
            <StatCard
              title="Active Rentals"
              value={stats.activeRentals}
              subtitle={`${stats.totalRentals} total`}
              icon="🔑"
              color="indigo"
            />
            <StatCard
              title="Affiliate Earnings"
              value={formatCurrency(stats.affiliateEarnings)}
              subtitle="Total commissions"
              icon="🤝"
              color="orange"
            />
          </div>
        )}

        {/* Charts Section */}
        {charts && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">📈 Trends</h2>
              <div className="flex gap-2">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setChartDays(d)}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      chartDays === d
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <ChartCard
                title="Orders"
                data={charts.ordersPerDay}
                dataKey="count"
                color="#8B5CF6"
              />
              <ChartCard
                title="Legacy order revenue"
                data={charts.revenuePerDay}
                dataKey="total"
                color="#10B981"
                isCurrency
              />
              <ChartCard
                title="New Users"
                data={charts.usersPerDay}
                dataKey="count"
                color="#3B82F6"
              />
              <ChartCard
                title="Support Tickets"
                data={charts.ticketsPerDay}
                dataKey="count"
                color="#EC4899"
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-6 rounded-xl bg-slate-800/50 border border-white/10">
          <h2 className="font-semibold mb-4">⚡ Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/orders"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition"
            >
              View Orders
            </a>
            <a
              href="/admin/tickets"
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-sm transition"
            >
              View Tickets
            </a>
            <a
              href="/admin/wallet"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm transition"
            >
              Manage Wallets
            </a>
            <a
              href="/admin/affiliates"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm transition"
            >
              Affiliate Directory
            </a>
            <a
              href="/admin/rentals"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition"
            >
              Manage Rentals
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
    indigo: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  };

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} border`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

// Simple Chart Card (bar visualization)
function ChartCard({
  title,
  data,
  dataKey,
  color,
  isCurrency = false,
}: {
  title: string;
  data: { _id: string; [key: string]: any }[];
  dataKey: string;
  color: string;
  isCurrency?: boolean;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
        <h3 className="text-sm font-medium mb-4">{title}</h3>
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d[dataKey] || 0), 1);
  const total = data.reduce((sum, d) => sum + (d[dataKey] || 0), 0);

  return (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-gray-400">
          Total:{" "}
          {isCurrency
            ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
            : total.toLocaleString()}
        </span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {data.slice(-14).map((d, i) => {
          const height = ((d[dataKey] || 0) / maxVal) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all hover:opacity-80"
              style={{
                height: `${Math.max(height, 4)}%`,
                backgroundColor: color,
              }}
              title={`${d._id}: ${isCurrency ? "$" : ""}${d[dataKey]?.toLocaleString() || 0}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-500">
        <span>{data[Math.max(0, data.length - 14)]?._id?.slice(5) || ""}</span>
        <span>{data[data.length - 1]?._id?.slice(5) || ""}</span>
      </div>
    </div>
  );
}
