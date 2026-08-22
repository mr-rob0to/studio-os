import { handleCreateBriefRequest } from "@/server/http/briefs";

export async function POST(request: Request): Promise<Response> {
  return handleCreateBriefRequest(request);
}
