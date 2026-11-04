export interface Row {
  [column: string]: string;
}

export interface ParseOptions {
  header?: boolean;
  delimiter?: string;
}

const CR = "\r";
const LF = "\n";
const CRLF = "\r\n";
const QUOTE = '"';
const DOUBLE_QUOTE = '""';

const assertDelimiter = (delimiter: string): void => {
  if (delimiter.length !== 1 || delimiter === QUOTE || delimiter === CR || delimiter === LF) {
    throw new Error("csv: delimiter must be a single character, not quote or newline");
  }
};

export function parse(input: string, options: ParseOptions = {}): string[][] | Row[] {
  const delimiter = options.delimiter ?? ",";
  assertDelimiter(delimiter);
  const rows = parseRows(input, delimiter);
  if (options.header) {
    if (rows.length === 0) return [];
    const header = rows[0];
    const result: Row[] = [];
    for (let r = 1; r < rows.length; r++) {
      const fields = rows[r];
      const row: Row = {};
      for (let c = 0; c < header.length; c++) {
        row[header[c]] = fields[c] ?? "";
      }
      result.push(row);
    }
    return result;
  }
  return rows;
}

function parseRows(input: string, delimiter: string): string[][] {
  const len = input.length;
  if (len === 0) return [];

  const delim = delimiter.charCodeAt(0);
  const rows: string[][] = [];
  let fields: string[] = [];
  let i = 0;

  while (i < len) {
    let c = input.charCodeAt(i);

    if (c === 34) {
      let field = "";
      let start = ++i;
      while (true) {
        const q = input.indexOf(QUOTE, i);
        if (q === -1) throw new Error("csv: unterminated quoted field");
        if (input.charCodeAt(q + 1) === 34) {
          field += input.slice(start, q + 1);
          start = i = q + 2;
          continue;
        }
        field += input.slice(start, q);
        i = q + 1;
        break;
      }
      fields.push(field);
      if (i >= len) {
        rows.push(fields);
        return rows;
      }
      c = input.charCodeAt(i);
      if (c !== delim && c !== 13 && c !== 10) {
        throw new Error("csv: unexpected character after closing quote");
      }
    } else {
      const start = i;
      while (i < len && (c = input.charCodeAt(i)) !== delim && c !== 13 && c !== 10) {
        if (c === 34) throw new Error("csv: quote inside unquoted field");
        i++;
      }
      fields.push(input.slice(start, i));
      if (i >= len) {
        rows.push(fields);
        return rows;
      }
    }

    if (c === delim) {
      i++;
      if (i === len) {
        fields.push("");
        rows.push(fields);
        return rows;
      }
    } else {
      if (c === 13 && input.charCodeAt(i + 1) === 10) i++;
      rows.push(fields);
      fields = [];
      i++;
    }
  }

  return rows;
}

export function stringify(
  rows: readonly (readonly string[] | Row)[],
  options: ParseOptions = {},
): string {
  const delimiter = options.delimiter ?? ",";
  assertDelimiter(delimiter);
  const lines: string[] = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const fields = Array.isArray(row) ? row : Object.values(row);
    let line = "";
    for (let c = 0; c < fields.length; c++) {
      if (c > 0) line += delimiter;
      line += quote(fields[c], delimiter);
    }
    lines.push(line);
  }
  return lines.join(CRLF);
}

const quote = (value: string, delimiter: string): string => {
  if (value === "") return value;
  if (value.includes(QUOTE)) {
    return QUOTE + value.replaceAll(QUOTE, DOUBLE_QUOTE) + QUOTE;
  }
  if (value.includes(delimiter) || value.includes(LF) || value.includes(CR)) {
    return QUOTE + value + QUOTE;
  }
  return value;
};
