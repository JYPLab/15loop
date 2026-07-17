import { dailyWords } from "../../../data/words";
import { contentCatalogSummary } from "../../../lib/content-catalog";
import { curriculumSummary, summarizeCurriculumCoverage } from "../../../lib/curriculum";

export async function GET() {
  const reviewedContent = summarizeCurriculumCoverage(dailyWords.map((item) => item.word));

  return Response.json({
    ...curriculumSummary,
    reviewedContent,
    candidateCatalog: contentCatalogSummary,
    contentStatus: "curriculum-indexed",
  });
}
