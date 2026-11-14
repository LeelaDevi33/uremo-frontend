"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  useSiteSettings,
} from "@/hooks/useSiteSettings";

export default function Footer() {
  const pathname = usePathname();
  const { data: settings } = useSiteSettings();

  if (pathname?.startsWith("/admin")) return null;

  const footer = settings?.footer || DEFAULT_PUBLIC_SITE_SETTINGS.footer;
  const support = settings?.support || DEFAULT_PUBLIC_SITE_SETTINGS.support;
  const site = settings?.site || DEFAULT_PUBLIC_SITE_SETTINGS.site;

  const supportEmail =
    support.supportEmail || DEFAULT_PUBLIC_SITE_SETTINGS.support.supportEmail;

  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur">
      <div className="u-container py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-lg font-semibold text-white/95">
              {site.brandName || DEFAULT_PUBLIC_SITE_SETTINGS.site.brandName}
            </div>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              {footer.disclaimer ||
                DEFAULT_PUBLIC_SITE_SETTINGS.footer.disclaimer}
            </p>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              {footer.dataSafetyNote ||
                DEFAULT_PUBLIC_SITE_SETTINGS.footer.dataSafetyNote}
            </p>
          </div>

          <div className="text-sm">
            <div className="text-white/90 font-medium">
              {footer.linksTitle ||
                DEFAULT_PUBLIC_SITE_SETTINGS.footer.linksTitle}
            </div>
            <div className="mt-3 flex flex-col gap-2 text-slate-300">
              <Link
                href="/avail-service"
                className="hover:text-white transition"
              >
                {footer.servicesLinkText ||
                  DEFAULT_PUBLIC_SITE_SETTINGS.footer.servicesLinkText}
              </Link>
              <Link
                href="/open-roles"
                className="hover:text-white transition"
              >
                {footer.workLinkText ||
                  DEFAULT_PUBLIC_SITE_SETTINGS.footer.workLinkText}
              </Link>
              <Link
                href="/support"
                className="hover:text-white transition"
              >
                {footer.contactLinkText ||
                  DEFAULT_PUBLIC_SITE_SETTINGS.footer.contactLinkText}
              </Link>
            </div>
          </div>

          <div className="text-sm">
            <div className="text-white/90 font-medium">
              {footer.supportTitle ||
                DEFAULT_PUBLIC_SITE_SETTINGS.footer.supportTitle}
            </div>
            <div className="mt-3 text-slate-300">
              {supportEmail ? <div className="leading-relaxed">
                {footer.supportPrompt ||
                  DEFAULT_PUBLIC_SITE_SETTINGS.footer.supportPrompt}{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-white/90 hover:text-white underline underline-offset-4"
                >
                  {supportEmail}
                </a>
              </div> : <Link href="/support/tickets" className="underline">Open a support ticket</Link>}
              {support.whatsappNumber ? (
                <div className="mt-2 text-slate-400">
                  {(footer.whatsappLabel ||
                    DEFAULT_PUBLIC_SITE_SETTINGS.footer.whatsappLabel) +
                    ":"}{" "}
                  {support.whatsappNumber}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-xs text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            {footer.copyrightText ||
              DEFAULT_PUBLIC_SITE_SETTINGS.footer.copyrightText}
          </div>
          <div className="text-slate-500">
            {site.bannerText || DEFAULT_PUBLIC_SITE_SETTINGS.site.bannerText}
          </div>
        </div>
      </div>
    </footer>
  );
}
