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
      </header>

      <section
        className="workspace-context workspace-context-board"
        aria-labelledby="page-title"
      >
        <div>
          <p className="context-label">Brief board</p>
          <h1 id="page-title">Creative briefs</h1>
        </div>
        <p>
          Review briefs and start the next one when a project needs direction.
        </p>
        <Link className="button-link button-link-small" href="/briefs/new">
          New brief
        </Link>
      </section>

      <BriefList briefs={briefs} />

      <footer className="footer">
        <p>Internal studio workspace</p>
        <p>Brief board</p>
      </footer>
    </main>
  );
}
