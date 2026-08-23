import type { BriefAnalysis, BriefDetail } from "@/contracts";

import { AnalysisRetry } from "./analysis-retry";

const decisionLabels: Record<
  BriefAnalysis["recommendation"]["decision"],
  string
> = {
  ready_for_development: "Ready for development",
  needs_revision: "Needs revision",
  needs_discussion: "Needs discussion",
};

const ownerLabels: Record<BriefAnalysis["nextActions"][number]["owner"], string> = {
  producer: "Producer",
  creative_lead: "Creative lead",
  animation_lead: "Animation lead",
  team: "Team",
};

export function BriefAnalysisPanel({ detail }: { detail: BriefDetail }) {
  const analysis = detail.analysis;
  const result = analysis?.result;

  if (analysis?.status === "failed") {
    return (
      <AnalysisState
        briefId={detail.id}
        description="The brief is saved, but analysis could not be completed. Retry when you are ready."
        resetKey={analysis.updatedAt.toISOString()}
        status="Failed"
        title="Analysis needs attention"
      />
    );
  }

  if (analysis?.status === "pending") {
    return (
      <AnalysisState
        briefId={detail.id}
        description="Analysis is still running. If the request was interrupted, retry will safely recover it when eligible."
        resetKey={analysis.updatedAt.toISOString()}
        status="Pending"
        title="Analysis in progress"
      />
    );
  }

  if (!result) {
    return (
      <section className="analysis-panel analysis-state" aria-labelledby="analysis-title">
        <p className="context-label">Studio analysis</p>
        <h2 id="analysis-title">Analysis unavailable</h2>
        <p>This brief does not have a readable analysis.</p>
      </section>
    );
  }

  return (
    <section className="analysis-panel" aria-labelledby="analysis-title">
      <header className="analysis-heading">
        <div>
          <p className="context-label">Studio analysis</p>
          <h2 id="analysis-title">Creative readiness review</h2>
        </div>
        <span className="status-chip status-chip-completed">Completed</span>
      </header>

      <section
        aria-label="Analysis recommendation"
        className={`recommendation recommendation-${result.recommendation.decision}`}
      >
        <p className="analysis-section-label">Recommendation</p>
        <h3>{decisionLabels[result.recommendation.decision]}</h3>
        <p>{result.recommendation.rationale}</p>
      </section>

      <div className="analysis-grid">
        <AnalysisList title="Themes" items={result.themes} />
        <AnalysisSection title="Classification">
          <dl className="analysis-definition-list">
            <div>
              <dt>Format</dt>
              <dd>{result.classification.format}</dd>
            </div>
            <div>
              <dt>Tone</dt>
              <dd>{joinOrFallback(result.classification.tone)}</dd>
            </div>
            <div>
              <dt>Genre signals</dt>
              <dd>{joinOrFallback(result.classification.genreSignals)}</dd>
            </div>
          </dl>
        </AnalysisSection>
        <AnalysisSection title="Audience">
          <p>{result.audience.interpretation}</p>
          <DetailGroup label="Audience needs" items={result.audience.audienceNeeds} />
          <DetailGroup
            label="Accessibility considerations"
            items={result.audience.accessibilityConsiderations}
          />
        </AnalysisSection>
        <AnalysisList title="Strengths" items={result.strengths} />
        <AnalysisList title="Opportunities" items={result.opportunities} />
        <AnalysisList
          title="Risks and ambiguities"
          items={result.risksAndAmbiguities}
        />
        <AnalysisList title="Missing information" items={result.missingInformation} />
        <AnalysisSection className="analysis-section-wide" title="Next actions">
          <ol className="next-actions-list">
            {result.nextActions.map((nextAction) => (
              <li key={`${nextAction.owner}-${nextAction.action}`}>
                <p>{nextAction.action}</p>
                <div>
                  <span>{ownerLabels[nextAction.owner]}</span>
                  <span className={`priority priority-${nextAction.priority}`}>
                    {capitalize(nextAction.priority)} priority
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </AnalysisSection>
      </div>
    </section>
  );
}

function AnalysisState({
  briefId,
  description,
  resetKey,
  status,
  title,
}: {
  briefId: string;
  description: string;
  resetKey: string;
  status: "Failed" | "Pending";
  title: string;
}) {
  return (
    <section className="analysis-panel analysis-state" aria-labelledby="analysis-title">
      <header className="analysis-heading">
        <div>
          <p className="context-label">Studio analysis</p>
          <h2 id="analysis-title">{title}</h2>
        </div>
        <span className={`status-chip status-chip-${status.toLowerCase()}`}>
          {status}
        </span>
      </header>
      <p>{description}</p>
      <AnalysisRetry briefId={briefId} key={resetKey} />
    </section>
  );
}

function AnalysisSection({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={`analysis-section ${className}`.trim()}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <AnalysisSection title={title}>
      {items.length > 0 ? (
        <ul className="analysis-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="analysis-empty">None identified.</p>
      )}
    </AnalysisSection>
  );
}

function DetailGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="analysis-detail-group">
      <h4>{label}</h4>
      {items.length > 0 ? (
        <ul className="analysis-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="analysis-empty">None identified.</p>
      )}
    </div>
  );
}

function joinOrFallback(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "None identified";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
