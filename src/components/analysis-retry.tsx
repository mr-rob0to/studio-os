"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiErrorSchema } from "@/contracts";

const retryFailureMessage =
  "We couldn't retry analysis. Refresh the page and try again.";
const concurrentRetryMessage =
  "Analysis is already in progress. Refresh to see the latest status.";

export function AnalysisRetry({ briefId }: { briefId: string }) {
  const router = useRouter();
  const retryInFlight = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRetry() {
    if (retryInFlight.current) {
      return;
    }

    retryInFlight.current = true;
    setIsRetrying(true);
    setRetryError(null);
    let keepLocked = false;

    try {
      const response = await fetch(`/api/briefs/${briefId}/analysis`, {
        method: "POST",
      });

      if (response.ok) {
        keepLocked = true;
        router.refresh();
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      const apiError = apiErrorSchema.safeParse(body);

      setRetryError(
        apiError.success && apiError.data.error.code === "ANALYSIS_IN_PROGRESS"
          ? concurrentRetryMessage
          : retryFailureMessage,
      );
    } catch {
      setRetryError(retryFailureMessage);
    } finally {
      retryInFlight.current = keepLocked;
      setIsRetrying(keepLocked);
    }
  }

  return (
    <div className="retry-control">
      {retryError ? (
        <p className="retry-error" role="alert">
          {retryError}
        </p>
      ) : null}
      <button
        className="submit-button retry-button"
        disabled={isRetrying}
        onClick={handleRetry}
        type="button"
      >
        {isRetrying ? "Retrying…" : "Retry analysis"}
      </button>
    </div>
  );
}
