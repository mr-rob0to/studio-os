import "server-only";

import { checkDatabaseReadinessFromEnvironment } from "@/server/db/health";

export const DATABASE_HEALTH_BUDGET_MS = 2_000;
const HEALTH_RESPONSE_HEADERS = { "Cache-Control": "no-store" };

async function checkReadinessWithinBudget(): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Database readiness timed out.")),
      DATABASE_HEALTH_BUDGET_MS,
    );
  });

  try {
    await Promise.race([
      Promise.resolve().then(() => checkDatabaseReadinessFromEnvironment()),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export async function handleHealthRequest(): Promise<Response> {
  try {
    await checkReadinessWithinBudget();

    return Response.json(
      { status: "healthy", database: "ready" },
      { status: 200, headers: HEALTH_RESPONSE_HEADERS },
    );
  } catch {
    return Response.json(
      { status: "degraded", database: "unavailable" },
      { status: 503, headers: HEALTH_RESPONSE_HEADERS },
    );
  }
}
