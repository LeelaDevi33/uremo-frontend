"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiSupport } from "@/components/ui/Emoji";

export default function SupportPage() {
  const { data: settings } = useSiteSettings();

  const whatsappConfigured = (
    settings?.support?.whatsappNumber ||
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
    ""
  ).trim();

  const supportEmail = settings.support.supportEmail.trim();

  // wa.me expects digits only (no +, spaces, or dashes)
  const whatsappDigits = whatsappConfigured.replace(/[^\d]/g, "");
  const whatsappDisplay = whatsappConfigured.startsWith("+")
    ? whatsappConfigured
    : whatsappDigits
      ? `+${whatsappDigits}`
      : "";
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="u-container max-w-2xl"
    >
      <PageHeader
        title="Support"
        emoji={<EmojiSupport />}
        description="Get help with applications, project access, wallet transactions, or your account."
        actionLabel="View My Tickets"
        actionHref="/support/tickets"
      />

      {/* Support Tickets Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="card mb-6"
      >
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 transition">
          <div className="flex items-start gap-4">
            <div className="text-2xl">Ticket</div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Support Tickets</h3>
              <p className="text-sm text-slate-300 mb-3">
                Create and track support tickets. Get detailed help from our
                team.
              </p>
              <Link
                href="/support/tickets"
                className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 transition font-medium"
              >
                View My Tickets <span className="text-[#9CA3AF]">→</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Support Options Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="card space-y-6 mb-8"
      >
        <div className="space-y-4">
          {/* Email Support */}
          {supportEmail && <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
            <div className="flex items-start gap-4">
              <div className="text-2xl">Email</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Email Support</h3>
                <p className="text-sm text-slate-300 mb-3">
                  Send us an email for any questions or issues.
                </p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 transition font-medium"
                >
                  {supportEmail} <span className="text-[#9CA3AF]">→</span>
                </a>
              </div>
            </div>
          </div>}

          {/* WhatsApp Support - Optional, config-driven */}
          {whatsappDigits ? (
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
              <div className="flex items-start gap-4">
                <div className="text-2xl">Chat</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    WhatsApp Support
                  </h3>
                  <p className="text-sm text-slate-300 mb-3">
                    Quick responses via WhatsApp.
                  </p>
                  {whatsappDisplay && (
                    <p className="text-xs text-slate-400 mb-3">
                      {whatsappDisplay}
                    </p>
                  )}

                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 transition font-medium"
                  >
                    Contact via WhatsApp{" "}
                    <span className="text-[#9CA3AF]">→</span>
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          {/* Order Chat */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
            <div className="flex items-start gap-4">
              <div className="text-2xl">Chat</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Order Chat</h3>
                <p className="text-sm text-slate-300 mb-3">
                  Have an active order? Message your specialist directly.
                </p>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 transition font-medium"
                >
                  Go to my orders <span className="text-[#9CA3AF]">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10"
      >
        <p className="text-sm text-blue-100">
          <span className="font-semibold">Tip:</span> If your issue is tied to
          an order, replying inside the order chat is fastest—your specialist
          sees it immediately.
        </p>
      </motion.div>
    </motion.div>
  );
}
