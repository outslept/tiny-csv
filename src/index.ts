export interface Row {
  [column: string]: string;
}

export interface ParseOptions {
  header?: boolean;
  delimiter?: string;
}

const CRLF = "\r\n";
const LF = "\n";
const QUOTE = '"';

const assertDelimiter = (delimiter: string): void => {
  if (delimiter.length !== 1 || delimiter === QUOTE || delimiter === CR || delimiter === LF) {
    throw new Error("csv: delimiter must be a single character, not quote or newline");
  }
};

const CR = "\r";

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
  const rows: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;
  let i = 0;

  const endField = () => {
    fields.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRecord = () => {
    endField();
    if (!(fields.length === 1 && fields[0] === "" && !fieldStarted)) {
      rows.push(fields);
    }
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
        }
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === QUOTE) {
      if (field !== "") {
        throw new Error("csv: quote inside unquoted field");
      }
      inQuotes = true;
      fieldStarted = true;
      i += 1;
      continue;
    }

    if (ch === delimiter) {
      endField();
      i += 1;
      continue;
    }

    if (ch === CR) {
      if (input[i + 1] === LF) i += 1;
      endRecord();
      i += 1;
      continue;
    }
    if (ch === LF) {
      endRecord();
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (inQuotes) throw new Error("csv: unterminated quoted field");
  if (i > 0 && (input[input.length - 1] === CR || input[input.length - 1] === LF)) return rows;
  endRecord();
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
      return fields.map(quote).join(delimiter);
    })
    .join(CRLF);
}

const quote = (value: string): string => {
  if (value === "") return value;
  if (/[",\r\n]/.test(value)) return QUOTE + value.replaceAll(QUOTE, QUOTE + QUOTE) + QUOTE;
  return value;
};
