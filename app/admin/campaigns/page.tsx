"use client";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import Card from "@/components/Card";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiCampaigns } from "@/components/ui/Emoji";
import { useState, useEffect } from "react";

const INTEREST_LABELS: Record<string, string> = {
  microjobs: "Open roles",
  rentals: "Project rentals",
  project_purchase: "Project purchases",
};

export default function CampaignsPage() {
  const { user, isAuthenticated, ready } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Load past events
  useEffect(() => {
    if (isAuthenticated && ready) {
      loadEvents();
    }
  }, [isAuthenticated, ready]);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://uremo-backend.onrender.com"}/api/admin/campaigns/events`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEvents(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    const MAX_TITLE = 500;
    const MAX_MESSAGE = 5000;

    if (!title.trim() || !message.trim()) {
      toast("Title and message are required", "error");
      return;
    }

    if (title.length > MAX_TITLE) {
      toast(`Title exceeds ${MAX_TITLE} characters`, "error");
      return;
    }

    if (message.length > MAX_MESSAGE) {
      toast(`Message exceeds ${MAX_MESSAGE} characters`, "error");
      return;
    }

    for (const tag of selectedTags) {
      if (!Object.hasOwn(INTEREST_LABELS, tag)) {
        toast(`Invalid interest: ${tag}`, "error");
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast("Not authenticated", "error");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://uremo-backend.onrender.com"}/api/admin/campaigns/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            message,
            targetTags: selectedTags,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast("Campaign sent successfully", "success");
          setTitle("");
          setMessage("");
          setSelectedTags([]);
          loadEvents();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast(errorData.message || "Failed to send campaign", "error");
      }
    } catch (error) {
      console.error("Error sending campaign:", error);
      toast("Error sending campaign", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <div className="u-container text-sm text-[#9CA3AF]">Loading…</div>;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="u-container">
        <Card title="Campaigns">
          <p className="text-sm text-[#9CA3AF]">Admin access required.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="u-container space-y-6">
      <PageHeader
        title="Email Campaigns"
        emoji={<EmojiCampaigns />}
        description="Send targeted engagement campaigns to users"
      />

      {/* Campaign Form */}
      <Card title="Create New Campaign">
        <form onSubmit={handleSendCampaign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Campaign Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., New Microjobs Opportunities"
              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your campaign message here..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Interests (Optional - leave empty for all users)
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(INTEREST_LABELS).map(([tag, label]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {selectedTags.length === 0
                ? "No interests selected - will send to all active users"
                : `Targeting ${selectedTags.length} interest(s)`}
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? "Sending..." : "Send Campaign"}
            </button>
          </div>
        </form>
      </Card>

      {/* Past Events */}
      <Card title="Campaign History">
        {loadingEvents ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-400">No campaigns sent yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event._id}
                className="p-3 rounded-lg bg-slate-700/50 border border-slate-600"
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div>
                    <p className="font-medium text-slate-200">{event.title}</p>
                    <p
                      className="text-sm text-slate-400 line-clamp-2"
                      title={event.message}
                    >
                      {event.message}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                      event.processed
                        ? "bg-green-900/30 text-green-400"
                        : "bg-yellow-900/30 text-yellow-400"
                    }`}
                  >
                    {event.processed ? "Sent" : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <div>
                    {event.targetTags?.length > 0 && (
                      <span className="inline-block mr-3">
                        Tags: {event.targetTags.join(", ")}
                      </span>
                    )}
                    {event.processed && (
                      <span className="inline-block">
                        Sent to: {event.sentCount || 0} users
                      </span>
                    )}
                  </div>
                  <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
