import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceUrl = "https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf";
const outputPath = resolve(repositoryRoot, "data/curriculum/ko-2022-basic-words.json");

const expectedCounts = {
  total: 3000,
  elementary: 800,
  "secondary-common": 1200,
  advanced: 1000,
};

function markerTier(marker) {
  if (marker === "*") return "elementary";
  if (marker === "**") return "secondary-common";
  return "advanced";
}

function cleanLine(line) {
  return line
    .replace(/\u00ad/g, "")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isolateWordList(text) {
  const headingMatch = /(?:^|\n)\s*기본 어휘 목록\s*(?:\r?\n)/m.exec(text);
  if (!headingMatch) throw new Error("Could not find the basic vocabulary list heading.");
  const start = headingMatch.index + headingMatch[0].length;

  const endHeadings = [
    "II. 기본 어휘 관련 지침 개정 내용",
    "Ⅱ. 기본 어휘 관련 지침 개정 내용",
  ];
  const end = endHeadings
    .map((heading) => text.indexOf(heading, start))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (end == null) throw new Error("Could not find the end of the basic vocabulary list.");
  return text.slice(start, end);
}

function normalizedEntryLines(section) {
  const lines = [];

  for (const sourceLine of section.split(/\r?\n/)) {
    const line = cleanLine(sourceLine);
    if (!line || /^[A-Z]$/.test(line) || /^[()/]+$/.test(line) || /^-?\s*\d+\s*-?$/.test(line)) continue;
    const previous = lines.at(-1) ?? "";
    const previousHasOpenParenthesis = (previous.match(/\(/g)?.length ?? 0) > (previous.match(/\)/g)?.length ?? 0);
    if (lines.length && (previousHasOpenParenthesis || previous.endsWith("/") || /^\(.*\)$/.test(line))) {
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${line}`;
      continue;
    }
    lines.push(line);
  }

  return lines;
}

function splitOutsideParentheses(value) {
  const parts = [];
  let depth = 0;
  let current = "";

  for (const character of value) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (character === "/" && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  parts.push(current.trim());
  return parts;
}

function parseEntry(raw, index) {
  const slashParts = splitOutsideParentheses(raw);
  const primary = slashParts[0].replace(/\s*\(.*$/, "").trim();
  const marker = primary.endsWith("**") ? "**" : primary.endsWith("*") ? "*" : "";
  const lemma = primary.replace(/\*+$/, "").trim().toLowerCase();

  if (!/^[a-z][a-z .'-]*$/.test(lemma)) {
    throw new Error(`Unrecognized headword at parsed row ${index}: ${raw}`);
  }

  const aliases = slashParts.slice(1).map((part) => (
    part.replace(/\s*\(.*$/, "").replace(/\*+$/, "").trim().toLowerCase()
  )).filter(Boolean);
  const relatedForms = [...raw.matchAll(/\(([^)]+)\)/g)]
    .flatMap((match) => match[1].split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return {
    index,
    lemma,
    aliases,
    relatedForms,
    tier: markerTier(marker),
    marker,
    raw,
    sourceId: "ko-2022-basic-english",
  };
}

export function parseCurriculumWords(text) {
  return normalizedEntryLines(isolateWordList(text)).map((line, index) => parseEntry(line, index + 1));
}

export function validateCurriculumWords(words) {
  const counts = words.reduce((result, word) => {
    result.total += 1;
    result[word.tier] += 1;
    return result;
  }, { total: 0, elementary: 0, "secondary-common": 0, advanced: 0 });

  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (counts[key] !== expected) {
      const aliasCount = words.reduce((total, word) => total + word.aliases.length, 0);
      throw new Error(`Expected ${expected} ${key} words, parsed ${counts[key]} entries with ${aliasCount} aliases (${JSON.stringify(counts)}). No output was written.`);
    }
  }

  const duplicateLemmas = words
    .map((word) => word.lemma)
    .filter((lemma, index, all) => all.indexOf(lemma) !== index);
  if (duplicateLemmas.length) {
    throw new Error(`Duplicate headwords found: ${[...new Set(duplicateLemmas)].join(", ")}`);
  }

  return counts;
}

async function downloadPdf(destination) {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Failed to download source PDF: HTTP ${response.status}`);
  await writeFile(destination, new Uint8Array(await response.arrayBuffer()));
}

async function extractWordListText(pdfPath, temporaryDirectory) {
  const textPath = join(temporaryDirectory, "word-list.txt");
  const extractorPath = resolve(repositoryRoot, "scripts/extract-korean-curriculum-pdf.py");
  const python = process.env.PYTHON || "python3";

  try {
    await execFileAsync(python, [extractorPath, pdfPath, textPath]);
  } catch (error) {
    throw new Error("Python with `pdfplumber` is required to extract the three-column source PDF.", { cause: error });
  }

  return readFile(textPath, "utf8");
}

async function main() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "loopvoca-curriculum-"));
  const pdfPath = join(temporaryDirectory, "source.pdf");

  try {
    await downloadPdf(pdfPath);
    const text = await extractWordListText(pdfPath, temporaryDirectory);
    const words = parseCurriculumWords(text);
    const counts = validateCurriculumWords(words);
    const dataset = {
      metadata: {
        curriculum: "2022-revised",
        country: "KR",
        language: "en",
        sourceId: "ko-2022-basic-english",
        sourceUrl,
        generatedAt: new Date().toISOString(),
        counts,
      },
      words,
    };

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
    process.stdout.write(`Wrote ${counts.total} curriculum words to ${outputPath}\n`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
