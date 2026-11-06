import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./market.module.css";

const icons = {
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  back: <><path d="m11 6-6 6 6 6M5 12h14" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  apply: <><path d="m5 17-1 4 4-1L20 8l-3-3ZM15 7l3 3" /></>,
  rent: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18m-13 4h4" /></>,
  buy: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9m-3 3 2 2m-5 1 2 2" /></>,
  work: <><rect x="3" y="7" width="18" height="14" rx="3" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0m-9 1v3" /></>,
  check: <path d="m4 12 5 5L20 6" />,
};

export function MarketIcon({ name, size = 18 }: { name: keyof typeof icons; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>;
}

export function MarketPage({ children }: { children: ReactNode }) {
  return <div className={styles.canvas}><div className={styles.container}>{children}</div></div>;
}

export function BackToMarket() {
  return <Link href="/explore-services" className={styles.textLink}><MarketIcon name="back" /> All opportunities</Link>;
}

export function LoadingState({ label }: { label: string }) {
  return <div className={styles.notice} role="status"><span className={styles.spinner} aria-hidden="true" />{label}</div>;
}

export function Notice({ title, children, retry }: { title: string; children?: ReactNode; retry?: () => void }) {
  return <div className={styles.notice} role="status"><h2>{title}</h2>{children}{retry && <button type="button" className={styles.secondary} onClick={retry}>Try again</button>}</div>;
}
