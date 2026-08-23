import { handleHealthRequest } from "@/server/http/health";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleHealthRequest();
}
