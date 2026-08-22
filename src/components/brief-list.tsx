import Link from "next/link";

import type { PersistedBrief } from "@/contracts";

const contentTypeLabels: Record<PersistedBrief["contentType"], string> = {
  short_film: "Short film",
  series: "Series",
  feature: "Feature",
  commercial: "Commercial",
  music_video: "Music video",
  other: "Other",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function BriefList({ briefs }: { briefs: PersistedBrief[] }) {
  if (briefs.length === 0) {
    return (
      <section className="empty-state" aria-labelledby="empty-title">
        <p className="eyebrow">No frames on the board</p>
        <h2 id="empty-title">No briefs yet</h2>
        <p>
          Start with the creative direction your team needs to align around.
        </p>
        <Link className="button-link" href="/briefs/new">
          Create the first brief
        </Link>
      </section>
    );
  }

  return (
    <section className="brief-collection" aria-labelledby="brief-count">
      <p className="collection-count" id="brief-count">
        {briefs.length} {briefs.length === 1 ? "brief" : "briefs"}
      </p>
      <ol className="brief-list" aria-label="Submitted briefs" role="list">
        {briefs.map((brief, index) => (
          <li className="brief-card" key={brief.id} role="listitem">
            <span className="frame-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="brief-meta">
                <span>{contentTypeLabels[brief.contentType]}</span>
                <time dateTime={brief.createdAt.toISOString()}>
                  {dateFormatter.format(brief.createdAt)}
                </time>
              </p>
              <h2>
                <Link href={`/briefs/${brief.id}`}>{brief.title}</Link>
              </h2>
              <p className="brief-audience">For {brief.targetAudience}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
