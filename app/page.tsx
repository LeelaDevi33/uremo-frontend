"use client";

/**
 * PATCH_50: Public Homepage Conversion & Trust Rebuild
 * Premium, high-trust, high-conversion landing page
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";

type PlatformStats = {
  activeServices: number;
  activeJobRoles: number;
  totalUsers: number;
  completedOrders: number;
};

type AudienceTab = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

const AUDIENCE_TABS: AudienceTab[] = [
  {
    id: "beginners",
    label: "Beginners",
    icon: "New",
    description:
      "New to online work? UREMO guides you step-by-step with training materials, screening tests, and supervised projects. No experience required.",
  },
  {
    id: "freelancers",
    label: "Freelancers",
    icon: "Pro",
    description:
      "Expand your income streams with verified gigs, microjobs, and project-based work. Get paid securely through our wallet system.",
  },
  {
    id: "students",
    label: "Students",
    icon: "Study",
    description:
      "Earn while you learn with flexible work opportunities. Complete tasks on your schedule and build real-world skills.",
  },
  {
    id: "side-hustlers",
    label: "Side Hustlers",
    icon: "Extra",
    description:
      "Looking for extra income? Pick up verified microjobs and projects that fit around your main job or commitments.",
  },
  {
    id: "entrepreneurs",
    label: "Digital Entrepreneurs",
    icon: "Biz",
    description:
      "Access premium digital services, account rentals, and tools to scale your online business. Build your affiliate network.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activeAudienceTab, setActiveAudienceTab] = useState("beginners");

  // Fetch platform stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await apiRequest<{ ok: boolean; stats: PlatformStats }>(
        "/api/public/stats",
      );
      if (data?.ok) {
        setStats(data.stats);
      }
    } catch {
      // Silently fail - stats are optional
    }
  }, []);

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    fetchStats();
  }, [ready, isAuthenticated, fetchStats]);

  if (!ready || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ==================== SECTION 1: HERO ==================== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-28"
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Work. Earn. Learn.
              <br />
              <span className="text-blue-400">
                Or Build Your Digital Career
              </span>
              <br />— All in One Platform.
            </h1>

            <p className="text-lg md:text-xl text-slate-300 mt-6 max-w-xl">
              UREMO connects people with verified online gigs, microjobs,
              financial account services, and guided work opportunities — with
              real human support.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href="/buy-service">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary w-full sm:w-auto text-lg px-8 py-3"
                >
                  Explore Services
                </motion.button>
              </Link>
              <Link href="/apply-to-work">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-secondary w-full sm:w-auto text-lg px-8 py-3"
                >
                  Apply To Work
                </motion.button>
              </Link>
            </div>

            <p className="text-slate-500 mt-6 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300">
                Login →
              </Link>
            </p>
          </div>

          {/* Right Visual */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-emerald-500/20 rounded-3xl blur-3xl" />
              <div className="relative grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5"
                >
                  <div className="text-4xl mb-3">Shop</div>
                  <h3 className="font-semibold text-white">Buy Services</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Verified digital services
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="card p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
                >
                  <div className="text-4xl mb-3">Earn</div>
                  <h3 className="font-semibold text-white">Earn Money</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Complete verified tasks
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="card p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/5"
                >
                  <div className="text-4xl mb-3">Learn</div>
                  <h3 className="font-semibold text-white">Learn Skills</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Training & screening
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="card p-6 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
                >
                  <div className="text-4xl mb-3">Help</div>
                  <h3 className="font-semibold text-white">Human Support</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Real people helping you
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ==================== SECTION 2: WHAT YOU CAN DO ==================== */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-16"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            What You Can Do on UREMO
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            Three paths to success — choose what fits your goals
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Explore Services */}
          <motion.div
            whileHover={{ y: -8 }}
            className="card p-8 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-500/5 border-blue-500/20 hover:border-blue-500/40 transition-all"
          >
            <div className="text-5xl mb-6">Shop</div>
            <h3 className="text-xl font-bold text-white mb-4">
              Explore Services
            </h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                Buy verified digital services
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                Rent accounts & tools
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                Complete deals at percentage
              </li>
            </ul>
            <Link
              href="/buy-service"
              className="btn-primary w-full mt-6 block text-center"
            >
              Browse Services →
            </Link>
          </motion.div>

          {/* Card 2: Apply To Work */}
          <motion.div
            whileHover={{ y: -8 }}
            className="card p-8 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 transition-all"
          >
            <div className="text-5xl mb-6">Work</div>
            <h3 className="text-xl font-bold text-white mb-4">Apply To Work</h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                Microjobs & quick tasks
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                Writing & content jobs
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                Screening-based projects
              </li>
            </ul>
            <Link
              href="/apply-to-work"
              className="btn-primary w-full mt-6 block text-center"
            >
              View Job Roles →
            </Link>
          </motion.div>

          {/* Card 3: Workspace */}
          <motion.div
            whileHover={{ y: -8 }}
            className="card p-8 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5 border-purple-500/20 hover:border-purple-500/40 transition-all"
          >
            <div className="text-5xl mb-6">WS</div>
            <h3 className="text-xl font-bold text-white mb-4">Workspace</h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">1.</span>
                Complete Training
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">2.</span>
                Pass Screening Test
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">3.</span>
                Work on Projects & Earn
              </li>
            </ul>
            <Link
              href="/signup"
              className="btn-primary w-full mt-6 block text-center"
            >
              Get Started →
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ==================== SECTION 3: HOW UREMO WORKS ==================== */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-16"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">How UREMO Works</h2>
          <p className="text-slate-400 mt-3">Simple steps to get started</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            {
              step: 1,
              icon: "Browse",
              title: "Explore or Apply",
              desc: "Browse services or apply to work positions",
            },
            {
              step: 2,
              icon: "Verify",
              title: "Get Verified",
              desc: "Complete screening & verification process",
            },
            {
              step: 3,
              icon: "Work",
              title: "Start Working",
              desc: "Begin tasks or avail services",
            },
            {
              step: 4,
              icon: "Pay",
              title: "Earn or Receive",
              desc: "Get paid or receive your delivery",
            },
          ].map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="card text-center p-6 relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center">
                {item.step}
              </div>
              <div className="text-4xl mb-4 mt-2">{item.icon}</div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ==================== SECTION 4: WHY PEOPLE TRUST UREMO ==================== */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-16"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            Why People Trust UREMO
          </h2>
          <p className="text-slate-400 mt-3">
            Built with security and transparency in mind
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "Verify",
              title: "Manual Human Verification",
              desc: "Every user, service, and transaction is reviewed by real humans — no bots or automation.",
            },
            {
              icon: "Admin",
              title: "Admin Moderated Jobs",
              desc: "All job roles, screenings, and projects are created and managed by UREMO admins.",
            },
            {
              icon: "Safe",
              title: "No Auto-Payout Scams",
              desc: "Earnings are manually credited after proof verification. No automatic deductions or fake payouts.",
            },
            {
              icon: "Wallet",
              title: "Wallet-Based Secure System",
              desc: "All payments flow through a secure wallet system with full transaction history.",
            },
            {
              icon: "Help",
              title: "Support Ticket System",
              desc: "Real support tickets with human responses. Get help when you need it.",
            },
            {
              icon: "Lock",
              title: "Private Proof Of Work",
              desc: "Your work submissions are private by default. Only visible to admins for verification.",
            },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="card p-6 bg-gradient-to-br from-white/5 to-transparent"
            >
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ==================== SECTION 5: FEATURE HIGHLIGHTS ==================== */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-16"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Platform Features</h2>
          <p className="text-slate-400 mt-3">
            Everything you need in one place
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: "Dash", title: "Smart Workspace" },
            { icon: "Wallet", title: "Wallet System" },
            { icon: "Aff", title: "Affiliate Program" },
            { icon: "Rent", title: "Rentals & Subs" },
            { icon: "Notify", title: "Notifications" },
            { icon: "AI", title: "JarvisX AI" },
          ].map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ scale: 1.05 }}
              className="card p-4 text-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-sm font-medium text-slate-300">{item.title}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ==================== SECTION 6: REAL PLATFORM STATS ==================== */}
      {stats && (
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto px-4 sm:px-6 py-16"
        >
          <div className="card p-8 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border-blue-500/20">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Real Platform Stats
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-4xl md:text-5xl font-bold text-blue-400">
                  {stats.activeServices}
                </p>
                <p className="text-slate-400 mt-2">Active Services</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-bold text-emerald-400">
                  {stats.activeJobRoles}
                </p>
                <p className="text-slate-400 mt-2">Job Roles</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-bold text-purple-400">
                  {stats.totalUsers}
                </p>
                <p className="text-slate-400 mt-2">Registered Users</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-bold text-amber-400">
                  {stats.completedOrders}
                </p>
                <p className="text-slate-400 mt-2">Completed Orders</p>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ==================== SECTION 7: WHO UREMO IS FOR ==================== */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-16"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold">Who UREMO Is For</h2>
          <p className="text-slate-400 mt-3">Find your path on the platform</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {AUDIENCE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAudienceTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeAudienceTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeAudienceTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 text-center max-w-2xl mx-auto"
        >
          <div className="text-5xl mb-4">
            {AUDIENCE_TABS.find((t) => t.id === activeAudienceTab)?.icon}
          </div>
          <h3 className="text-xl font-bold text-white mb-3">
            {AUDIENCE_TABS.find((t) => t.id === activeAudienceTab)?.label}
          </h3>
          <p className="text-slate-300 leading-relaxed">
            {AUDIENCE_TABS.find((t) => t.id === activeAudienceTab)?.description}
          </p>
        </motion.div>
      </motion.section>

      {/* ==================== SECTION 8: FINAL CTA ==================== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-20"
      >
        <div className="card p-12 text-center bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-emerald-500/15 border-blue-500/30">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Your Journey With UREMO Today
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-8">
            Create an account to apply for work, track your orders, and manage
            your wallet.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary text-lg px-8 py-3 w-full sm:w-auto"
              >
                Create Account
              </motion.button>
            </Link>
            <Link href="/buy-service">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-secondary text-lg px-8 py-3 w-full sm:w-auto"
              >
                Explore Services
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Footer spacing */}
      <div className="h-16" />
    </div>
  );
}
