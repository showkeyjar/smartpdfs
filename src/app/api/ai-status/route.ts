import { getRecommendedSetup } from "@/lib/ai-config";

export async function GET() {
  const setup = getRecommendedSetup();
  return Response.json(setup);
}

export const runtime = "edge";