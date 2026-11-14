import Link from "next/link";

export default function ArticleNotFound() {
  return <section className="mx-auto max-w-3xl px-4 py-16">
    <h1 className="text-3xl font-bold text-white">Article unavailable</h1>
    <p className="my-4 text-slate-300">This article is no longer published at this address.</p>
    <Link href="/blogs" className="text-teal-300 underline">Browse published articles</Link>
  </section>;
}
