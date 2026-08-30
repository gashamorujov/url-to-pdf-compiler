import type { AnalysisStats, UrlEntry } from '../types';

const PAGE_PARAMS = new Set(['pagenumber', 'page', 'p', 'page_num', 'page-number', 'pageid', 'pg']);

export function detectPageNumber(url: string): number | null {
  try {
    const u = new URL(url);
    for (const [key, value] of u.searchParams.entries()) {
      if (PAGE_PARAMS.has(key.toLowerCase()) && /^\d{1,6}$/.test(value.trim())) {
        return parseInt(value.trim(), 10);
      }
    }
  } catch {
    // not a valid URL - handled elsewhere
  }
  return null;
}

export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function analyzeUrls(rawText: string): { entries: UrlEntry[]; stats: AnalysisStats } {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const seen = new Set<string>();
  const seenPages = new Set<number>();
  const duplicatePages: number[] = [];
  const entries: UrlEntry[] = [];

  let duplicatesRemoved = 0;
  let invalid = 0;
  let originalIndex = 0;

  for (const line of lines) {
    const url = line;
    if (seen.has(url)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(url);
    if (!isHttpUrl(line)) {
      invalid++;
      continue;
    }

    const pageNumber = detectPageNumber(line);
    if (pageNumber !== null) {
      if (seenPages.has(pageNumber)) duplicatePages.push(pageNumber);
      else seenPages.add(pageNumber);
    }

    entries.push({
      id: crypto.randomUUID(),
      url: line,
      pageNumber,
      status: 'pending',
      originalIndex,
    });
    originalIndex++;
  }

  const sorted = [...entries].sort((a, b) => {
    const hasA = a.pageNumber !== null;
    const hasB = b.pageNumber !== null;
    if (hasA && hasB) return a.pageNumber! - b.pageNumber!;
    return 0; // stable: entries without page numbers keep user order
  });

  return {
    entries: sorted,
    stats: {
      total: entries.length,
      duplicatesRemoved,
      invalid,
      duplicatePages: [...new Set(duplicatePages)],
    },
  };
}
