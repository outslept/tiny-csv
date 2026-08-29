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
    const [header, ...rest] = rows;
    return rest.map((fields) =>
      Object.fromEntries(header.map((name, i) => [name, fields[i] ?? ""])),
    );
  }
  return rows;
}

function parseRows(input: string, delimiter: string): string[][] {
  if (input === "") return [];

  const rows: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    fields.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    rows.push(fields);
    fields = [];
  };

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === QUOTE) {
        if (input[i + 1] === QUOTE) {
          field += QUOTE;
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
          const next = input[i];
          if (next !== undefined && next !== delimiter && next !== CR && next !== LF) {
            throw new Error("csv: unexpected character after closing quote");
          }
        }
      } else {
        field += ch;
        i += 1;
      }
      continue;
    }

    if (ch === QUOTE) {
      if (field !== "") throw new Error("csv: quote inside unquoted field");
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === delimiter) {
      endField();
      i += 1;
      continue;
    }

    if (ch === CR || ch === LF) {
      if (ch === CR && input[i + 1] === LF) i += 1;
      endRecord();
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (inQuotes) throw new Error("csv: unterminated quoted field");

  const last = input[input.length - 1];
  if (last !== CR && last !== LF) endRecord();
  return rows;
}

export function stringify(
  rows: readonly (readonly string[] | Row)[],
  options: ParseOptions = {},
): string {
  const delimiter = options.delimiter ?? ",";
  assertDelimiter(delimiter);
  return rows
    .map((row) => {
      const fields = Array.isArray(row) ? row : Object.values(row);
      return fields.map((value) => quote(value, delimiter)).join(delimiter);
    })
    .join(CRLF);
}

const quote = (value: string, delimiter: string): string => {
  if (value === "") return value;
  if (
    value.includes(delimiter) ||
    value.includes(QUOTE) ||
    value.includes(CR) ||
    value.includes(LF)
  ) {
    return QUOTE + value.replaceAll(QUOTE, QUOTE + QUOTE) + QUOTE;
  }
  return value;
};
