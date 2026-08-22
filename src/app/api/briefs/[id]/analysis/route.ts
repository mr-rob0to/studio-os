import { handleRetryAnalysisRequest } from "@/server/http/briefs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  return handleRetryAnalysisRequest(request, id);
}
