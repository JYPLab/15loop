import { contentCatalogSummary } from "../../../lib/content-catalog";

export async function GET() {
  return Response.json(contentCatalogSummary, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
