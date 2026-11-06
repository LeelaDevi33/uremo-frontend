"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { chargeTerms, rentalTerm, type AccessGrant, type Opportunity, type PaidIntent } from "@/lib/opportunities";
import { formatPrice } from "@/lib/orderPrice";
import { useOpportunityData } from "./useOpportunityData";
import styles from "./market.module.css";

type Receipt = { grant: AccessGrant; walletBalance: number; replayed: boolean };

export default function WalletConfirmation({ item, type, token, onCancel, onSuccess, onRefresh }: {
  item: Opportunity; type: PaidIntent; token: string; onCancel: () => void;
  onSuccess: (grant: AccessGrant) => void; onRefresh: () => void;
}) {
  const { expectedAmount } = chargeTerms(item, type);
  const key = `uremo-opportunity-charge:${item._id}:${type}:${expectedAmount}:${type === "rent" ? item.rentalDays : ""}`;
  const requestId = useRef("");
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [stale, setStale] = useState(false);
  const { state, reload } = useOpportunityData<{ balance: number; spendable?: number; pendingWithdrawals?: number }>("/api/wallet/balance", token);
  const wallet = state.phase === "loaded" ? state.data : null;
  const available = wallet?.spendable ?? (wallet ? wallet.balance - (wallet.pendingWithdrawals ?? 0) : NaN);
  const balance = Number.isFinite(available) ? Math.max(0, available) : null;
  useEffect(() => { heading.current?.focus(); }, []);

  function forgetRequest() {
    requestId.current = "";
    try { sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
  }

  async function confirm() {
    if (submitting.current || stale || (!uncertain && (balance === null || balance < expectedAmount))) return;
    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (!requestId.current) {
        try { requestId.current = sessionStorage.getItem(key) || ""; } catch { /* Storage may be disabled. */ }
        if (!requestId.current) requestId.current = crypto.randomUUID();
        try { sessionStorage.setItem(key, requestId.current); } catch { /* Retry still reuses the in-memory ID. */ }
      }
      const receipt = await apiRequest<Receipt>(`/api/opportunities/${item._id}/${type}`, "POST", {
        requestId: requestId.current, ...chargeTerms(item, type),
      }, true);
      if (!receipt?.grant?._id || receipt.grant.opportunityId !== item._id ||
          receipt.grant.type !== type || receipt.grant.amount !== expectedAmount) throw new Error("Invalid receipt");
      forgetRequest();
      if (!receipt.grant.active && receipt.replayed) {
        setUncertain(false);
        setMessage("Your earlier payment was recorded and that access has ended. Review the current balance before confirming a new payment.");
        reload();
        return;
      }
      onSuccess(receipt.grant);
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        forgetRequest();
        if (error.status === 409) {
          setStale(true);
          setMessage("The terms or availability changed. Refresh this opportunity before continuing.");
        } else if (error.status === 402) {
          setMessage("Your wallet has insufficient funds for this charge.");
          reload();
        } else {
          setMessage(error.message);
        }
        setUncertain(false);
      } else {
        setUncertain(true);
        setMessage("The server did not confirm the result. Check My access or retry this same request.");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section className={styles.confirm} aria-label="Wallet confirmation">
      <h3 tabIndex={-1} ref={heading}>Review {type === "rent" ? "rental" : "buyout"}</h3>
      <p>{type === "rent"
        ? `Exclusive access starts when payment succeeds and expires after ${rentalTerm(item.rentalDays)}. You pay once.`
        : "You receive the exclusive rights to this project and permanent access to its handoff. Confirming closes the listing to future applicants, renters and buyers."}</p>
      <dl className={styles.receipt}>
        <div><dt>Wallet charge</dt><dd>{formatPrice(expectedAmount, item.currency)} USD</dd></div>
        <div><dt>Available balance</dt><dd>{state.phase === "loading" ? "Checking…" : balance === null ? "Unavailable" : formatPrice(balance, item.currency)}</dd></div>
        {balance !== null && balance >= expectedAmount && <div><dt>Balance after payment</dt><dd>{formatPrice(balance - expectedAmount, item.currency)}</dd></div>}
      </dl>
      {state.phase !== "loading" && balance === null && <button type="button" className={styles.textLink} onClick={reload}>Retry balance check</button>}
      {balance !== null && balance < expectedAmount && <p className={styles.alert}>You need {formatPrice(expectedAmount - balance, item.currency)} more in your wallet.</p>}
      {message && <p role="alert" className={styles.alert}>{message}</p>}
      {uncertain && <Link href="/opportunities/access" className={styles.textLink}>Check My access</Link>}
      <div className={styles.buttonRow}>
        {stale ? <button type="button" className={styles.primary} onClick={onRefresh}>Refresh opportunity</button> :
          <button className={styles.primary} type="button" disabled={busy || (!uncertain && (balance === null || balance < expectedAmount))} onClick={confirm}>
            {busy ? "Confirming…" : uncertain ? "Retry same payment" : `Confirm ${formatPrice(expectedAmount, item.currency)} payment`}
          </button>}
        <button type="button" className={styles.secondary} disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
