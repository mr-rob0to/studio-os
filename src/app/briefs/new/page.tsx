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
        <Link className="text-link" href="/briefs">
          Back to briefs
        </Link>
      </header>

      <section className="page-heading form-heading" aria-labelledby="page-title">
        <p className="eyebrow">New project frame</p>
        <h1 id="page-title">Create a creative brief</h1>
        <p className="lede">
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
