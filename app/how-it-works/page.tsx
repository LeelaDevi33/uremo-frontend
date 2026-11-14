import Link from "next/link";
export const metadata = { title: "How roles and project access work" };

const options = [
  { title: "Apply for a specialization", href: "/open-roles", action: "Open roles", text: "Choose an open role, review its requirements and apply for free. The team reviews your application and any required screenings." },
  { title: "Rent a project", href: "/projects/rent", action: "Rent projects", text: "Qualified workers can rent a specific project in their specialization. Review the term and price before confirming the wallet payment." },
  { title: "Get Full Access", href: "/projects/full-access", action: "Full Access projects", text: "Anyone can purchase permanent, exclusive access to an available project. Sign in to confirm the one-time wallet charge. Your profile holds the project handoff." },
];
export default function HowItWorks() {
  return <main className="mx-auto max-w-4xl px-5 py-12 sm:py-20"><h1 className="text-4xl font-semibold tracking-tight">How roles and project access work</h1>
    <div className="mt-10 divide-y divide-white/15 border-y border-white/15">{options.map(option => <section key={option.href} className="grid gap-2 py-7 sm:grid-cols-[1fr_2fr]">
      <h2 className="text-xl font-semibold">{option.title}</h2><div><p className="text-slate-300">{option.text}</p><Link href={option.href} className="mt-2 inline-block text-teal-300 underline">{option.action}</Link></div></section>)}</div>
  </main>;
}
