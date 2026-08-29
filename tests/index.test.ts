import { test, expect } from "vite-plus/test";
import { parse, stringify } from "../src/index.js";

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

test("leading empty field", () => {
  expect(parse(",b")).toEqual([["", "b"]]);
});

test("empty input yields no rows", () => {
  expect(parse("")).toEqual([]);
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

test("semicolon delimiter", () => {
  expect(parse("a;b\n1;2", { delimiter: ";" })).toEqual([
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("tab delimiter", () => {
  expect(parse("a\tb\n1\t2", { delimiter: "\t" })).toEqual([
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("comma is plain data under a custom delimiter", () => {
  expect(parse(stringify([["a,b"]], { delimiter: ";" }), { delimiter: ";" })).toEqual([["a,b"]]);
});

test("delimiter of quote or newline throws", () => {
  expect(() => parse("a,b", { delimiter: '"' })).toThrow(/delimiter/);
  expect(() => parse("a,b", { delimiter: "\n" })).toThrow(/delimiter/);
  expect(() => parse("a,b", { delimiter: ",," })).toThrow(/delimiter/);
});

test("stringify joins with commas and CRLF", () => {
  expect(
    stringify([
      ["a", "b"],
      ["c", "d"],
    ]),
  ).toBe("a,b\r\nc,d");
});

test("stringify quotes fields containing delimiter, quote, or newline", () => {
  expect(stringify([["a,b", 'c"d', "e\nf"]])).toBe('"a,b","c""d","e\nf"');
});

test("stringify leaves clean fields untouched", () => {
  expect(stringify([["a", "b"]])).toBe("a,b");
});

test("stringify accepts objects", () => {
  expect(stringify([{ a: "1", b: "2" }])).toBe("1,2");
});

test("stringify omits trailing newline", () => {
  expect(stringify([["a"]]).endsWith("\r\n")).toBe(false);
});

test("stringify handles an empty row list", () => {
  expect(stringify([])).toBe("");
});

test("parse → stringify round-trips", () => {
  const csv = 'a,b\r\n"1 ""x"", 2",3\r\n"multi\r\nline",4\r\n';
  expect(stringify(parse(csv) as string[][])).toBe('a,b\r\n"1 ""x"", 2",3\r\n"multi\r\nline",4');
});

test("stringify → parse round-trips", () => {
  const rows = [
    ["a,b", 'c"d', "e\nf"],
    ["plain", "row"],
  ];
  expect(parse(stringify(rows))).toEqual(rows);
});

test("round-trip with delimiter option", () => {
  const rows = [
    ["a;b", "c"],
    ["d", "e;f"],
  ];
  expect(parse(stringify(rows, { delimiter: ";" }), { delimiter: ";" })).toEqual(rows);
});

test("round-trip with embedded CRLF", () => {
  const rows = [["line1\r\nline2"]];
  expect(parse(stringify(rows))).toEqual(rows);
});
