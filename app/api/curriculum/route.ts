import { dailyWords } from "../../../data/words";
import { curriculumSummary, summarizeCurriculumCoverage } from "../../../lib/curriculum";

export async function GET() {
  const reviewedContent = summarizeCurriculumCoverage(dailyWords.map((item) => item.word));

  return Response.json({
    ...curriculumSummary,
    reviewedContent,
    contentStatus: "curriculum-indexed",
  });
}
