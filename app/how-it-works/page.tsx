import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "How project access works" };

const options = [
  { title: "Apply to a role", text: "Open a listing and choose Apply. Review the role requirements, complete the application and follow its status in My applications. Applying is free." },
  { title: "Rent a project", text: "Check the rental price and duration on the listing. Confirm the wallet charge to open the project handoff. Your access ends at the time shown in My project access." },
  { title: "Buy outright", text: "Review the project and its terms, then confirm the one-time wallet charge. You receive exclusive access and the listing closes. A project with an active rental becomes available to buy after the rental ends." },
];

export default function HowItWorks() {
  return <section className="mx-auto max-w-4xl px-5 py-12 sm:py-20">
    <Link href="/explore-services" className="text-sm text-teal-300">← Opportunities</Link>
    <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">How project access works</h1>
    <p className="mt-5 text-lg text-slate-300">Each listing shows the access options its publisher offers.</p>
    <div className="mt-10 divide-y divide-white/15 border-y border-white/15">
      {options.map(option => <section key={option.title} className="grid gap-2 py-7 sm:grid-cols-[1fr_2fr] sm:gap-8">
        <h2 className="text-xl font-semibold">{option.title}</h2><p className="text-slate-300">{option.text}</p>
      </section>)}
    </div>
    <Link href="/explore-services" className="mt-8 inline-block rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950">Explore opportunities</Link>
  </section>;
}
