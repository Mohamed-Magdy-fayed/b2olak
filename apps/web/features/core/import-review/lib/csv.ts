const MAX_IMPORT_BYTES = 256 * 1024;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += char;
    }
  }

  out.push(cur);
  return out;
}

export function parseCsvToObjects(
  text: string,
): { headers: string[]; rows: Record<string, unknown>[] } | null {
  if (text.length > MAX_IMPORT_BYTES) return null;

  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const firstLine = lines[0];

  if (!firstLine) return null;

  const headers = parseCsvLine(firstLine);
  const rows: Record<string, unknown>[] = [];

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line) continue;

    const cells = parseCsvLine(line);
    const row: Record<string, unknown> = {};

    headers.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] ?? "";
    });

    rows.push(row);
  }

  return { headers, rows };
}
