"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

type Audience = "all" | "buyers" | "workers" | "custom";

type Campaign = {
  _id: string;
  subject: string;
  audience: Audience;
  createdAt: string;
  sentAt?: string | null;
  stats?: {
    totalTargeted?: number;
    totalSent?: number;
    totalFailed?: number;
  };
};

function parseEmails(input: string): string[] {
  const parts = String(input || "")
    .split(/[\n,\r]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

export default function AdminEmailCampaignsPage() {
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [customEmailsText, setCustomEmailsText] = useState("");
  const [htmlContent, setHtmlContent] = useState(
    '<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial">\n  <h2>UREMO Update</h2>\n  <p>Write your promo content here.</p>\n</div>'
  );
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const parsedCustomEmails = useMemo(() => {
    if (audience !== "custom") return [];
    return parseEmails(customEmailsText);
  }, [audience, customEmailsText]);

  const loadCampaigns = async () => {
    const data = await apiRequest<Campaign[]>(
      "/api/admin/email-campaigns",
      "GET",
      null,
      true
    );
    setCampaigns(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    setLoading(true);
    loadCampaigns()
      .catch((e: unknown) => {
        const msg = (e as any)?.message || "Failed to load campaigns";
        toast(msg, "error");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCampaign = async () => {
    const cleanSubject = subject.trim();
    const cleanHtml = htmlContent.trim();

    if (!cleanSubject) {
      toast("Subject is required", "error");
      return;
    }

    if (!cleanHtml) {
      toast("HTML content is required", "error");
      return;
    }

    if (audience === "custom" && parsedCustomEmails.length === 0) {
      toast("Please enter at least one custom email", "error");
      return;
    }

    setSending(true);
    try {
      const payload: any = {
        subject: cleanSubject,
        htmlContent: cleanHtml,
        audience,
      };
      if (audience === "custom") payload.customEmails = parsedCustomEmails;

      const result = await apiRequest<{
        campaignId: string;
        totalTargeted: number;
        message?: string;
      }>("/api/admin/email-campaigns", "POST", payload, true);

      toast(
        `Campaign created (${result.totalTargeted} recipients), sending in background`,
        "success"
      );

      setSubject("");
      if (audience === "custom") setCustomEmailsText("");

      await loadCampaigns();
    } catch (e: unknown) {
      const msg = (e as any)?.message || "Failed to create campaign";
      toast(msg, "error");
    } finally {
      setSending(false);
    }
  };

  const statsText = (c: Campaign) => {
    const s = c.stats || {};
    const targeted = s.totalTargeted ?? 0;
    const sent = s.totalSent ?? 0;
    const failed = s.totalFailed ?? 0;
    return `${sent}/${targeted} sent • ${failed} failed`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Admin — Email Campaigns</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create a campaign and send promo emails in the background.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadCampaigns()
              .catch((e: unknown) =>
                toast((e as any)?.message || "Failed to refresh", "error")
              )
              .finally(() => setLoading(false));
          }}
          className="btn-secondary"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="space-y-4">
            <div>
              <label htmlFor="campaign-subject" className="block text-sm text-slate-300 mb-2">
                Subject
              </label>
              <input
                id="campaign-subject"
                className="w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white placeholder:text-[#64748B]"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Limited offer — Get verified today"
                disabled={sending}
              />
            </div>

            <div>
              <label htmlFor="campaign-audience" className="block text-sm text-slate-300 mb-2">
                Audience
              </label>
              <select
                id="campaign-audience"
                className="w-full rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white"
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                disabled={sending}
              >
                <option value="all">All</option>
                <option value="buyers">Buyers</option>
                <option value="workers">Workers</option>
                <option value="custom">Custom</option>
              </select>
              <p className="text-xs text-slate-400 mt-2">
                Safety limit: max 300 recipients per campaign.
              </p>
            </div>

            {audience === "custom" && (
              <div>
                <label htmlFor="campaign-recipients" className="block text-sm text-slate-300 mb-2">
                  Custom emails (comma or newline separated)
                </label>
                <textarea
                  id="campaign-recipients"
                  className="w-full min-h-[90px] rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white placeholder:text-[#64748B]"
                  value={customEmailsText}
                  onChange={(e) => setCustomEmailsText(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  disabled={sending}
                />
                <p className="text-xs text-slate-400 mt-2">
                  Parsed: {parsedCustomEmails.length} unique emails
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <label htmlFor={preview ? undefined : "campaign-html"} className="block text-sm text-slate-300">
                HTML Content
              </label>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="text-sm text-slate-300 hover:text-white"
                disabled={sending}
              >
                {preview ? "Edit" : "Preview"}
              </button>
            </div>

            {!preview ? (
              <textarea
                id="campaign-html"
                className="w-full min-h-[320px] font-mono rounded-lg border border-white/10 bg-[#020617] px-3 py-2 text-xs text-white placeholder:text-[#64748B]"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                disabled={sending}
              />
            ) : (
              <iframe title="Email preview" sandbox="" referrerPolicy="no-referrer"
                className="block min-h-[320px] w-full rounded-lg border border-white/10 bg-white"
                srcDoc={'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">' + htmlContent} />
            )}

            <div className="flex gap-3 flex-wrap items-center">
              <button
                type="button"
                onClick={sendCampaign}
                disabled={sending}
                className="btn-primary"
              >
                {sending ? "Sending…" : "Send Campaign"}
              </button>
              <p className="text-sm text-slate-400">
                Campaign created, sending happens in background.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Campaign History</h2>
          <p className="text-sm text-slate-400 mt-1">Latest 20 campaigns</p>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-slate-400">No campaigns yet.</p>
            ) : (
              campaigns.map((c) => (
                <div
                  key={c._id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-semibold truncate">
                        {c.subject}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Audience: {c.audience}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-300">
                        {c.sentAt
                          ? `Sent: ${new Date(c.sentAt).toLocaleString()}`
                          : "Sending…"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {statsText(c)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
