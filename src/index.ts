export type CSVValue = string | number | boolean | null | undefined;
export type Row = Record<string, string>;

export interface CSVOptions {
  header?: boolean;
  delimiter?: string;
}

const CR = "\r";
const LF = "\n";
const CRLF = "\r\n";
const QUOTE = '"';
const DOUBLE_QUOTE = '""';

export function parse<T extends Record<string, string> = Row>(
  input: string,
  options: CSVOptions & { header: true },
): T[];
export function parse(input: string, options?: CSVOptions & { header?: false }): string[][];
export function parse(input: string, options?: CSVOptions): string[][] | Row[];
export function parse(input: string, options: CSVOptions = {}): string[][] | Row[] {
  const delimiter = options.delimiter ?? ",";
  if (delimiter.length !== 1) {
    throw new Error("csv: delimiter must be a single character");
  }
  const clean = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = parseRows(clean, delimiter.charCodeAt(0));

  if (options.header) {
    if (rows.length === 0) return [];
    const header = rows[0]!;
    const result: Row[] = [];
    for (let r = 1; r < rows.length; r++) {
      const fields = rows[r]!;
      const row: Row = {};
      for (let c = 0; c < header.length; c++) {
        row[header[c]!] = fields[c] ?? "";
      }
      result.push(row);
    }
    return result;
  }
  return rows;
}

function parseRows(input: string, delim: number): string[][] {
  const len = input.length;
  if (len === 0) return [];
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
  rows: readonly (readonly CSVValue[] | Record<string, CSVValue>)[],
  options: CSVOptions = {},
): string {
  const delimiter = options.delimiter ?? ",";
  if (delimiter.length !== 1) {
    throw new Error("csv: delimiter must be a single character");
  }
  if (rows.length === 0) return "";

  const lines: string[] = [];
  const first = rows[0]!;
  const isObjectRow = !Array.isArray(first);
  const keys = isObjectRow ? Object.keys(first) : undefined;

  if (options.header && keys) {
    lines.push(keys.map((k) => quote(k, delimiter)).join(delimiter));
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    let line = "";
    if (Array.isArray(row)) {
      for (let c = 0; c < row.length; c++) {
        if (c > 0) line += delimiter;
        line += quote(row[c], delimiter);
      }
    } else {
      const cols = keys ?? Object.keys(row);
      for (let c = 0; c < cols.length; c++) {
        if (c > 0) line += delimiter;
        line += quote((row as Record<string, CSVValue>)[cols[c]!], delimiter);
      }
    }
    lines.push(line);
  }
  return lines.join(CRLF);
}

function quote(raw: CSVValue, delimiter: string): string {
  if (raw === null || raw === undefined || raw === "") return "";
  const value = typeof raw === "string" ? raw : String(raw);
  if (value.includes(QUOTE)) {
    return QUOTE + value.replaceAll(QUOTE, DOUBLE_QUOTE) + QUOTE;
  }
  if (value.includes(delimiter) || value.includes(LF) || value.includes(CR)) {
    return QUOTE + value + QUOTE;
  }
  return value;
}
