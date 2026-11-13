import type { BadgeCounts } from "./AdminLayoutV2";

type AdminTool = { label: string; href: string; badge?: keyof BadgeCounts };
type ToolGroup = { id: string; label: string; shortLabel: string; tools: AdminTool[] };

export const adminToolGroups: ToolGroup[] = [
  { id: "market", label: "Roles & projects", shortLabel: "Roles", tools: [
    { label: "Open roles", href: "/admin/work-positions" },
    { label: "Applications", href: "/admin/applications", badge: "pendingApplications" },
    { label: "Projects", href: "/admin/workspace/projects" },
    { label: "Project offers", href: "/admin/opportunities" },
    { label: "Project access receipts", href: "/admin/opportunities#receipt-heading" },
  ] },
  { id: "work", label: "Workers & reviews", shortLabel: "Work", tools: [
    { label: "Worker directory", href: "/admin/workspace/workers" },
    { label: "Worker pipeline", href: "/admin/workforce" },
    { label: "Screenings", href: "/admin/workspace/screenings", badge: "invalidScreenings" },
    { label: "Screening reviews", href: "/admin/workspace/screening-reviews" },
    { label: "Proof reviews", href: "/admin/proofs", badge: "pendingProofs" },
    { label: "Workspace overview", href: "/admin/workspace" },
    { label: "Master workspace", href: "/admin/workspace/master" },
    { label: "Datasets", href: "/admin/datasets" },
    { label: "Dataset reviews", href: "/admin/rlhf-reviews" },
  ] },
  { id: "finance", label: "Wallet & referrals", shortLabel: "Funds", tools: [
    { label: "Wallets & manual top-ups", href: "/admin/wallet", badge: "pendingTopups" },
    { label: "Wallet withdrawals", href: "/admin/wallet#withdrawal-requests", badge: "walletWithdrawals" },
    { label: "Referral accounts", href: "/admin/affiliates" },
    { label: "Referral payouts", href: "/admin/affiliate", badge: "referralWithdrawals" },
    { label: "Payment operations", href: "/admin/payments" },
  ] },
  { id: "support", label: "Support & content", shortLabel: "Help", tools: [
    { label: "Support tickets", href: "/admin/tickets", badge: "openTickets" },
    { label: "Inbox", href: "/admin/messages" },
    { label: "Blog posts", href: "/admin/blogs" },
    { label: "Audience campaigns", href: "/admin/campaigns" },
    { label: "Email campaigns", href: "/admin/email" },
  ] },
  { id: "platform", label: "Site management", shortLabel: "Site", tools: [
    { label: "Site settings", href: "/admin/settings" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "JarvisX", href: "/admin/jarvisx" },
  ] },
  { id: "legacy", label: "Legacy services & orders", shortLabel: "Past", tools: [
    { label: "Service catalog", href: "/admin/services" },
    { label: "Service requests", href: "/admin/service-requests" },
    { label: "Service rentals", href: "/admin/rentals" },
    { label: "Orders", href: "/admin/orders", badge: "pendingOrders" },
    { label: "Cancelled orders", href: "/admin/cancelled-orders" },
  ] },
];

const toolsBySpecificity = adminToolGroups.flatMap(group => group.tools)
  .filter(tool => !tool.href.includes("#")).sort((left, right) => right.href.length - left.href.length);

export function adminToolForPath(pathname: string) {
  return toolsBySpecificity.find(tool => pathname === tool.href || pathname.startsWith(tool.href + "/"));
}
