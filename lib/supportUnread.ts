"use client";

import { useSyncExternalStore } from "react";

type UnreadState = {
  total: number;
  byOrder: Record<string, number>;
};

const STORAGE_KEY = "uremo_admin_support_unread_v1";

let initialized = false;
const emptySnapshot: UnreadState = { total: 0, byOrder: {} };
let state: UnreadState = emptySnapshot;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  }
}

function recalcTotal(nextByOrder: Record<string, number>) {
  let total = 0;
  for (const v of Object.values(nextByOrder)) total += Number(v || 0);
  return total;
}

function loadFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const byOrder =
      parsed && typeof parsed === "object" && parsed.byOrder && typeof parsed.byOrder === "object"
        ? (parsed.byOrder as Record<string, number>)
        : {};
    state = { total: recalcTotal(byOrder), byOrder };
  } catch {
    // ignore
  }
}

function persistToStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ total: state.total, byOrder: state.byOrder })
    );
  } catch {
    // ignore
  }
}

function ensureInit() {
  if (initialized) return;
  initialized = true;

  loadFromStorage();

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      loadFromStorage();
      emitChange();
    });
  }
}

export function getAdminSupportUnreadSnapshot(): UnreadState {
  ensureInit();
  return state;
}

export function subscribeAdminSupportUnread(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdminSupportUnread() {
  return useSyncExternalStore(
    subscribeAdminSupportUnread,
    getAdminSupportUnreadSnapshot,
    () => emptySnapshot
  );
}

export function setAdminSupportUnreadFromServer(byOrder: Record<string, number> | null | undefined) {
  ensureInit();
  const next = byOrder && typeof byOrder === "object" ? { ...byOrder } : {};
  state = { total: recalcTotal(next), byOrder: next };
  persistToStorage();
  emitChange();
}

export function incrementAdminSupportUnread(orderId: string, amount = 1) {
  ensureInit();
  const id = String(orderId || "").trim();
  if (!id) return;

  const nextByOrder = { ...state.byOrder };
  nextByOrder[id] = Math.max(0, Number(nextByOrder[id] || 0) + Number(amount || 0));
  state = { total: recalcTotal(nextByOrder), byOrder: nextByOrder };
  persistToStorage();
  emitChange();
}

export function clearAdminSupportUnreadForOrder(orderId: string) {
  ensureInit();
  const id = String(orderId || "").trim();
  if (!id) return;

  if (!state.byOrder[id]) return;
  const nextByOrder = { ...state.byOrder };
  delete nextByOrder[id];
  state = { total: recalcTotal(nextByOrder), byOrder: nextByOrder };
  persistToStorage();
  emitChange();
}

export function clearAllAdminSupportUnread() {
  ensureInit();
  state = { total: 0, byOrder: {} };
  persistToStorage();
  emitChange();
}
