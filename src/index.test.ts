import { describe, test, expect } from "vite-plus/test";
import { parse, stringify } from "./index.ts";

describe("parse", () => {
  test("single record", () => {
    expect(parse("a,b,c")).toEqual([["a", "b", "c"]]);
  });

  test("two records, CRLF", () => {
    expect(parse("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("bare LF accepted like CRLF", () => {
    expect(parse("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("bare CR accepted like CRLF", () => {
    expect(parse("a,b\rc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("trailing newline does not create an extra row", () => {
    expect(parse("a,b\r\n")).toEqual([["a", "b"]]);
  });

  test("blank line mid-file is a record with one empty field", () => {
    expect(parse("a,b\r\n\r\nc,d")).toEqual([["a", "b"], [""], ["c", "d"]]);
  });

  test("blank line at end of file is a record", () => {
    expect(parse("a,b\r\n\r\n")).toEqual([["a", "b"], [""]]);
  });

  test("single quoted empty field differs from empty input", () => {
    expect(parse('""')).toEqual([[""]]);
  });

  test("quoted field with delimiter inside", () => {
    expect(parse('"a,b",c')).toEqual([["a,b", "c"]]);
  });

  test("escaped quotes double to one", () => {
    expect(parse('"1 ""x"", 2",3')).toEqual([['1 "x", 2', "3"]]);
  });

  test("quoted field preserves CRLF verbatim", () => {
    expect(parse('"multi\r\nline",4')).toEqual([["multi\r\nline", "4"]]);
  });

  test("quoted field with bare LF inside", () => {
    expect(parse('"a\nb",c')).toEqual([["a\nb", "c"]]);
  });

  test("quoted field with bare CR inside", () => {
    expect(parse('"a\rb",c')).toEqual([["a\rb", "c"]]);
  });

  test("empty quoted field is a field", () => {
    expect(parse('a,"",b')).toEqual([["a", "", "b"]]);
  });

  test("leading and trailing empty fields", () => {
    expect(parse(",b")).toEqual([["", "b"]]);
    expect(parse("a,")).toEqual([["a", ""]]);
  });

  test("empty input yields no rows", () => {
    expect(parse("")).toEqual([]);
    expect(parse("", { header: true })).toEqual([]);
  });

  test("strips leading UTF-8 BOM", () => {
    expect(parse("\uFEFFa,b\r\n1,2", { header: true })).toEqual([{ a: "1", b: "2" }]);
  });

  test("quote inside unquoted field throws", () => {
    expect(() => parse('ab"cd')).toThrow(/quote inside unquoted field/);
  });

  test("quote after quoted field closes, then delimiter", () => {
    expect(parse('"a","b"')).toEqual([["a", "b"]]);
  });

  test("character after closing quote is a delimiter or newline only", () => {
    expect(() => parse('"a"x')).toThrow(/after closing quote/);
    expect(() => parse('"a" "b"')).toThrow(/after closing quote/);
  });

  test("unterminated quoted field throws", () => {
    expect(() => parse('"abc')).toThrow(/unterminated/);
  });

  test("header option maps rows to objects", () => {
    expect(parse("a,b\r\n1,2\r\n3,4", { header: true })).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  test("header with ragged rows pads and truncates", () => {
    expect(parse("a,b\r\n1\r\n2,3,4", { header: true })).toEqual([
      { a: "1", b: "" },
      { a: "2", b: "3" },
    ]);
  });

  test("header with duplicate column names keeps the last value", () => {
    expect(parse("a,a\r\n1,2", { header: true })).toEqual([{ a: "2" }]);
  });

  test("custom single-character delimiters", () => {
    expect(parse("a;b\n1;2", { delimiter: ";" })).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parse("a\tb\n1\t2", { delimiter: "\t" })).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("invalid delimiter throws", () => {
    expect(() => parse("a,b", { delimiter: "" })).toThrow(/single character/);
    expect(() => parse("a,b", { delimiter: "::" })).toThrow(/single character/);
  });
});

describe("stringify", () => {
  test("joins with commas and CRLF", () => {
    expect(
      stringify([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a,b\r\nc,d");
  });

  test("quotes fields containing delimiter, quote, CR, or LF", () => {
    expect(stringify([["a,b", 'c"d', "e\nf", "g\rh"]])).toBe('"a,b","c""d","e\nf","g\rh"');
  });

  test("leaves clean fields untouched", () => {
    expect(stringify([["a", "b"]])).toBe("a,b");
  });

  test("serializes numbers, booleans, null, and undefined", () => {
    expect(stringify([[1, true, null, undefined, "ok"]])).toBe("1,true,,,ok");
  });

  test("accepts objects with and without header option", () => {
    const rows = [
      { a: "1", b: "2" },
      { b: "4", a: "3" },
    ];
    expect(stringify(rows)).toBe("1,2\r\n3,4");
    expect(stringify(rows, { header: true })).toBe("a,b\r\n1,2\r\n3,4");
  });

  test("omits trailing newline", () => {
    expect(stringify([["a"]]).endsWith("\r\n")).toBe(false);
  });

  test("handles an empty row list", () => {
    expect(stringify([])).toBe("");
  });

  test("invalid delimiter throws", () => {
    expect(() => stringify([["a"]], { delimiter: "" })).toThrow(/single character/);
  });
});

describe("round-trip", () => {
  test("parse → stringify round-trips", () => {
    const csv = 'a,b\r\n"1 ""x"", 2",3\r\n"multi\r\nline",4\r\n';
    expect(stringify(parse(csv))).toBe('a,b\r\n"1 ""x"", 2",3\r\n"multi\r\nline",4');
  });

  test("stringify → parse round-trips", () => {
    const rows = [
      ["a,b", 'c"d', "e\nf"],
      ["plain", "row"],
    ];
    expect(parse(stringify(rows))).toEqual(rows);
  });

  test("object rows with header: true round-trip", () => {
    const rows = [
      { name: "Ada, Countess", role: "engineer" },
      { role: "architect", name: "Grace" },
    ];
    expect(parse(stringify(rows, { header: true }), { header: true })).toEqual([
      { name: "Ada, Countess", role: "engineer" },
      { name: "Grace", role: "architect" },
    ]);
  });

  test("round-trip with custom delimiter", () => {
    const rows = [
      ["a;b", "c,d"],
      ["e", "f;g"],
    ];
    expect(parse(stringify(rows, { delimiter: ";" }), { delimiter: ";" })).toEqual(rows);
  });

  test("round-trip with embedded CRLF", () => {
    const rows = [["line1\r\nline2"]];
    expect(parse(stringify(rows))).toEqual(rows);
  });
});
