"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

interface Message {
  _id: string;
  senderType: "user" | "admin";
  sender: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  message: string;
  attachment?: string;
  attachmentType?: string;
  attachments?: Array<{
    url: string;
    filename: string;
    fileType: string;
  }>;
  createdAt: string;
}

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  order?: { _id: string; orderNumber: string };
  user: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  assignedAdmin?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
  };
}

interface AdminUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

const statusColor = (status: string) => {
  switch (status) {
    case "open":
      return "bg-blue-600";
    case "in_progress":
      return "bg-yellow-600";
    case "waiting_user":
      return "bg-orange-600";
    case "closed":
      return "bg-gray-600";
    default:
      return "bg-gray-600";
  }
};

const priorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "text-red-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-green-400";
    default:
      return "text-gray-400";
  }
};

export default function AdminTicketViewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{
      url: string;
      filename: string;
      fileType: string;
      publicId: string;
      size: number;
    }>
  >([]);
  const [uploading, setUploading] = useState(false);
  // PATCH_35: Internal notes state
  const [internalNotes, setInternalNotes] = useState<
    Array<{
      _id?: string;
      note: string;
      createdBy?: {
        firstName?: string;
        lastName?: string;
        name?: string;
        email?: string;
      };
      createdAt: string;
    }>
  >([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAdmins = async () => {
    try {
      const res = await apiRequest<any>(
        "/api/admin/tickets/admins",
        "GET",
        null,
        true,
      );
      if (res.ok) {
        setAdminUsers(res.admins || []);
      }
    } catch (err) {
      console.error("Failed to load admins:", err);
    }
  };

  // PATCH_35: Load internal notes
  const loadInternalNotes = async () => {
    try {
      const res = await apiRequest<any>(
        `/api/admin/tickets/${ticketId}/notes`,
        "GET",
        null,
        true,
      );
      if (res.ok) {
        setInternalNotes(res.internalNotes || []);
      }
    } catch (err) {
      console.error("Failed to load internal notes:", err);
    }
  };

  // PATCH_35: Add internal note
  const addInternalNote = async () => {
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await apiRequest<any>(
        `/api/admin/tickets/${ticketId}/notes`,
        "POST",
        { note: newNote.trim() },
        true,
      );
      if (res.ok) {
        setInternalNotes(res.internalNotes || []);
        setNewNote("");
        toast("Note added", "success");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to add note", "error");
    } finally {
      setAddingNote(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "text/plain",
    ];

    const validFiles = Array.from(files).filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast(
          `${file.name} is not allowed. Only images, PDF, ZIP, and TXT.`,
          "error",
        );
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast(`${file.name} is too large. Max 10MB.`, "error");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await apiRequest<any>(
          "/api/upload/chat",
          "POST",
          formData,
          true,
          true,
        );

        if (uploadRes.url) {
          setAttachments((prev) => [
            ...prev,
            {
              url: uploadRes.url,
              filename: uploadRes.filename,
              fileType: uploadRes.fileType,
              publicId: uploadRes.publicId,
              size: uploadRes.size,
            },
          ]);
        }
      }
    } catch (err: any) {
      toast(err?.message || "Failed to upload files", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const assignTicket = async (adminId: string) => {
    setAssigningAdmin(true);
    try {
      const res = await apiRequest<any>(
        `/api/admin/tickets/${ticketId}/assign`,
        "PUT",
        { adminId: adminId || null },
        true,
      );
      if (res.ok && res.ticket) {
        setTicket(res.ticket);
        toast("Ticket assigned", "success");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to assign ticket", "error");
    } finally {
      setAssigningAdmin(false);
    }
  };

  const loadTicket = async () => {
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        apiRequest<any>(`/api/admin/tickets/${ticketId}`, "GET", null, true),
        apiRequest<any>(
          `/api/admin/tickets/${ticketId}/messages`,
          "GET",
          null,
          true,
        ),
      ]);

      if (ticketRes.ok && ticketRes.ticket) {
        setTicket(ticketRes.ticket);
      } else {
        toast("Ticket not found", "error");
        router.push("/admin/tickets");
        return;
      }

      if (messagesRes.ok) {
        setMessages(messagesRes.messages || []);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load ticket", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;

    setSending(true);
    try {
      const res = await apiRequest<any>(
        `/api/admin/tickets/${ticketId}/reply`,
        "POST",
        { message: reply, attachments },
        true,
      );

      if (res.ok && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setReply("");
        setAttachments([]);
        if (res.status) setTicket((t) => (t ? { ...t, status: res.status } : null));
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err: any) {
      toast(err?.message || "Failed to send reply", "error");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!ticket || ticket.status === newStatus) return;

    setUpdatingStatus(true);
    try {
      const res = await apiRequest<any>(
        `/api/admin/tickets/${ticketId}/status`,
        "PUT",
        { status: newStatus },
        true,
      );

      if (res.ok && res.ticket) {
        setTicket(res.ticket);
        toast(`Status updated to ${newStatus.replace(/_/g, " ")}`, "success");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to update status", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      loadTicket();
      loadAdmins();
      loadInternalNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    // Scroll to bottom when messages load
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="u-container max-w-4xl py-8">
        <p className="text-[#9CA3AF]">Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="u-container max-w-4xl py-8">
        <p className="text-[#9CA3AF]">Ticket not found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="u-container max-w-4xl py-8"
    >
      <div className="mb-6">
        <Link
          href="/admin/tickets"
          className="text-sm text-[#9CA3AF] hover:text-white transition"
        >
          ← Back to Tickets
        </Link>
      </div>

      {/* Ticket Header */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-2">{ticket.subject}</h1>
            <div className="flex flex-wrap gap-2 text-xs text-[#9CA3AF] mb-3">
              <span className="capitalize">
                {ticket.category.replace(/_/g, " ")}
              </span>
              <span>•</span>
              <span className={priorityColor(ticket.priority)}>
                {ticket.priority.toUpperCase()} Priority
              </span>
              <span>•</span>
              <span>Created {new Date(ticket.createdAt).toLocaleString()}</span>
            </div>

            {/* User Info */}
            {/* PATCH_72: Fixed name fallback and Order # link */}
            <div className="p-3 rounded-lg bg-[#1F2937] text-sm">
              <p className="font-medium">
                {ticket.user?.firstName && ticket.user?.lastName
                  ? `${ticket.user.firstName} ${ticket.user.lastName}`
                  : ticket.user?.firstName
                    ? ticket.user.firstName
                    : ticket.user?.name
                      ? ticket.user.name
                      : ticket.user?.email
                        ? ticket.user.email.split("@")[0]
                        : "Anonymous User"}
              </p>
              <p className="text-[#9CA3AF]">
                {ticket.user?.email || "No email on file"}
              </p>
              {ticket.order && ticket.order.orderNumber && (
                <Link
                  href={`/admin/orders/${ticket.order._id}`}
                  className="text-emerald-400 hover:underline mt-1 block"
                >
                  Order #{ticket.order.orderNumber}
                </Link>
              )}
            </div>
          </div>

          {/* Status Control - PATCH_77: Simplified with primary action hint */}
          <div className="flex flex-col gap-2">
            <span
              className={`${statusColor(ticket.status)} text-white text-xs px-3 py-1 rounded text-center`}
            >
              {ticket.status.replace(/_/g, " ").toUpperCase()}
            </span>
            {ticket.status === "closed" ? (
              <div className="text-xs text-[#9CA3AF] bg-[#1F2937] rounded px-3 py-2 border border-[#374151]">
                <span className="text-red-400">Ticket Closed</span>
                <p className="mt-1 opacity-75">
                  This ticket has been resolved. Create a new ticket for
                  follow-up issues.
                </p>
              </div>
            ) : (
              <>
                {/* PATCH_77: Primary action hint */}
                <p className="text-xs text-cyan-400 text-center">
                  ↓ Reply below to respond
                </p>
                {/* Collapsed status dropdown */}
                <details className="group">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 text-center">
                    Change status
                  </summary>
                  <select
                    aria-label="Ticket status"
                    value={ticket.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="u-select text-xs mt-1 w-full"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_user">Waiting on User</option>
                    <option value="closed">Closed</option>
                  </select>
                </details>
              </>
            )}
            <select
                    aria-label="Assigned administrator"
              value={ticket.assignedAdmin?._id || ""}
              onChange={(e) => assignTicket(e.target.value)}
              disabled={assigningAdmin}
              className="u-select text-xs"
            >
              <option value="">Unassigned</option>
              {adminUsers.map((admin) => (
                <option key={admin._id} value={admin._id}>
                  {admin.firstName} {admin.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SLA Info */}
        {(ticket.firstResponseAt || ticket.resolvedAt) && (
          <div className="text-xs text-[#9CA3AF] flex flex-wrap gap-4">
            {ticket.firstResponseAt && (
              <span>
                First Response:{" "}
                {new Date(ticket.firstResponseAt).toLocaleString()}
              </span>
            )}
            {ticket.resolvedAt && (
              <span>
                Resolved: {new Date(ticket.resolvedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="card mb-4"
        style={{ maxHeight: "50vh", overflowY: "auto" }}
      >
        {messages.length === 0 ? (
          <p className="text-[#9CA3AF]">No messages yet.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isAdmin = msg.senderType === "admin";
              return (
                <div
                  key={msg._id}
                  className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isAdmin
                        ? "bg-emerald-600/20 border border-emerald-500/30"
                        : "bg-[#1F2937] border border-[#374151]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-xs text-[#9CA3AF]">
                      <span className="font-medium">
                        {isAdmin
                          ? `Admin (${msg.sender?.firstName || "Staff"})`
                          : `${ticket.user?.firstName || "User"}`}
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                          >
                            Attachment: {att.filename || "Attachment"}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* PATCH_35: Internal Notes Section */}
      <div className="card mb-4">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium text-sm flex items-center gap-2">
            Internal Notes ({internalNotes.length})
            <span className="text-xs text-[#9CA3AF]">(Admin only)</span>
          </span>
          <span className="text-[#9CA3AF]">{showNotes ? "▲" : "▼"}</span>
        </button>

        {showNotes && (
          <div className="mt-4 space-y-3">
            {internalNotes.length === 0 && (
              <p className="text-[#9CA3AF] text-sm">No internal notes yet.</p>
            )}
            {internalNotes.map((note, idx) => (
              <div
                key={note._id || idx}
                className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm"
              >
                <p className="whitespace-pre-wrap">{note.note}</p>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  {note.createdBy?.firstName || note.createdBy?.name || "Admin"}{" "}
                  • {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add internal note..."
                className="u-input flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addInternalNote();
                  }
                }}
              />
              <button
                onClick={addInternalNote}
                disabled={addingNote || !newNote.trim()}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {addingNote ? "..." : "Add"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reply Box */}
      <div className="card">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply. You can also attach files."
          rows={3}
          className="u-textarea w-full mb-3"
        />

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-[#1F2937] rounded px-2 py-1 text-xs"
              >
                <span className="truncate max-w-[120px]">{att.filename}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-between items-center">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.zip,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-sm"
            >
              {uploading ? "Uploading..." : "Attach"}
            </button>
          </div>

          <div className="flex gap-3">
            {ticket.status !== "closed" && (
              <button
                onClick={() => updateStatus("closed")}
                disabled={updatingStatus}
                className="btn-secondary disabled:opacity-50"
              >
                Close Ticket
              </button>
            )}
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
