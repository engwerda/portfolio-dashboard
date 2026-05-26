const MONTH_NAMES_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

export function parseDate(raw: string): Date | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // DD-MMM-YYYY (e.g. 02-Apr-2026)
  m = s.match(/^(\d{1,2})[-/](\w{3})[-/](\d{2,4})/i);
  if (m) {
    const monthIdx = MONTH_NAMES_SHORT.indexOf(m[2].toLowerCase());
    if (monthIdx !== -1) {
      const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return new Date(year, monthIdx, +m[1]);
    }
  }

  // MM-DD-YYYY or DD-MM-YYYY — ambiguous, assume MM-DD-YYYY for US-style
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);

  // DD/MM/YY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (m) {
    const year = 2000 + +m[3];
    return new Date(year, +m[2] - 1, +m[1]);
  }

  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatSnapshotDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
