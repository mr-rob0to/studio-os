import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { BriefList } from "@/components/brief-list";
import { listBriefsFromEnvironment } from "@/server/briefs/queries";

export const metadata: Metadata = {
  title: "Creative briefs | Studio OS",
  description: "Review and create animation studio briefs.",
};

export default async function BriefsPage() {
  await connection();
  const briefs = await listBriefsFromEnvironment();

  return (
    <main className="shell workspace-shell" id="main-content">
      <header className="masthead">
        <Link className="wordmark" href="/briefs" aria-label="Studio OS briefs">
          Studio <span>OS</span>
        </Link>
        <Link className="button-link button-link-small" href="/briefs/new">
          New brief
        </Link>
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <p className="eyebrow">Creative development workspace</p>
        <h1 id="page-title">Creative briefs</h1>
        <p className="lede">
          Review the ideas on the board or start a new brief for analysis.
        </p>
      </section>

      <BriefList briefs={briefs} />

      <footer className="footer">
        <p>Internal studio workspace</p>
        <p>Brief board</p>
      </footer>
    </main>
  );
}
