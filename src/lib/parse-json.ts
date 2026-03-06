/**
 * Escape literal control characters (newlines, tabs, carriage returns) that
 * appear inside JSON string values. Claude sometimes outputs multi-line strings
 * with raw newlines instead of the escaped \n sequences, which breaks JSON.parse.
 */
export function sanitizeJson(raw: string): string {
  let inString = false;
  let escaped = false;
  let result = "";

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
    }

    result += ch;
  }

  return result;
}

export function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? sanitizeJson(match[0]) : null;
}
