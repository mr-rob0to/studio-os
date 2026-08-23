import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";

import { BriefAnalysisPanel } from "@/components/brief-analysis";
import type { PersistedBrief } from "@/contracts";
import { findBriefDetailFromEnvironment } from "@/server/briefs/queries";

export const metadata: Metadata = {
  title: "Creative brief | Studio OS",
  description: "Review a saved creative brief and its structured analysis.",
};

const contentTypeLabels: Record<PersistedBrief["contentType"], string> = {
  short_film: "Short film",
  series: "Series",
  feature: "Feature",
  commercial: "Commercial",
  music_video: "Music video",
  other: "Other",
};

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.uuid().safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  await connection();
  const detail = await findBriefDetailFromEnvironment(parsedId.data);

  if (!detail) {
    notFound();
  }

  return (
    <main className="shell workspace-shell" id="main-content">
      <header className="masthead">
        <Link className="wordmark" href="/briefs" aria-label="Studio OS briefs">
          Studio <span>OS</span>
        </Link>
      </header>

      <section className="workspace-context detail-context" aria-labelledby="page-title">
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            <li>
              <Link href="/briefs">Briefs</Link>
            </li>
            <li aria-current="page">Detail</li>
          </ol>
        </nav>
        <div>
          <p className="context-label">Creative brief</p>
          <h1 id="page-title">{detail.title}</h1>
        </div>
        <Link className="detail-board-link" href="/briefs">
          Back to brief board
        </Link>
      </section>

      <div className="brief-detail-layout">
        <aside className="brief-source-panel" aria-labelledby="brief-source-title">
          <header>
            <p className="context-label">Source material</p>
            <h2 id="brief-source-title">Submitted brief</h2>
          </header>
          <dl className="brief-facts">
            <div>
              <dt>Content type</dt>
              <dd>{contentTypeLabels[detail.contentType]}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>
                <time dateTime={detail.createdAt.toISOString()}>
                  {formatDate(detail.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
          <BriefField label="Description" value={detail.description} />
          <BriefField label="Target audience" value={detail.targetAudience} />
          <BriefField label="Notes" value={detail.notes ?? "No notes supplied."} />
        </aside>

        <BriefAnalysisPanel detail={detail} />
      </div>

      <footer className="footer">
        <p>Internal studio workspace</p>
        <p>Brief detail</p>
      </footer>
    </main>
  );
}

function BriefField({ label, value }: { label: string; value: string }) {
  return (
    <section className="brief-source-field">
      <h3>{label}</h3>
      <p>{value}</p>
    </section>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}
