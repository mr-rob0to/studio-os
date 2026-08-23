import type { Metadata } from "next";
import Link from "next/link";

import { BriefForm } from "@/components/brief-form";

export const metadata: Metadata = {
  title: "New creative brief | Studio OS",
  description: "Submit a creative brief for structured analysis.",
};

export default function NewBriefPage() {
  return (
    <main className="shell workspace-shell" id="main-content">
      <header className="masthead">
        <Link className="wordmark" href="/briefs" aria-label="Studio OS briefs">
          Studio <span>OS</span>
        </Link>
      </header>

      <section
        className="workspace-context workspace-context-form"
        aria-labelledby="page-title"
      >
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            <li>
              <Link href="/briefs">Briefs</Link>
            </li>
            <li aria-current="page">New brief</li>
          </ol>
        </nav>
        <h1 id="page-title">Create a creative brief</h1>
        <p>
          Give the team enough direction to assess the idea and decide the next
          useful step.
        </p>
      </section>

      <BriefForm />

      <footer className="footer">
        <p>Internal studio workspace</p>
        <p>New brief</p>
      </footer>
    </main>
  );
}
