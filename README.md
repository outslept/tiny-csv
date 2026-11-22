# tiny-csv

Strict RFC 4180 CSV parser and serializer. Zero dependencies.

## Parse

```typescript
import { parse, stringify } from "tiny-csv";

parse("a,b\r\n1,2");
// [["a", "b"], ["1", "2"]]

parse("a,b\r\n1,2", { header: true });
// [{ a: "1", b: "2" }]

parse('"a,b","say ""hi""",c');
// [["a,b", 'say "hi"', "c"]]
```

## Stringify

```typescript
stringify([["a,b", 'c"d', "plain"]]);
// '"a,b","c""d",plain'

stringify([{ a: 1, b: "two" }], { header: true });
// "a,b\r\n1,two"
```

## Options

| Option      | Default | Meaning                                                                                           |
| ----------- | ------- | ------------------------------------------------------------------------------------------------- |
| `header`    | `false` | `parse`: maps first row to `Row[]` keys. `stringify`: prepends header row when given object rows. |
| `delimiter` | `","`   | Any single character except `"` and newlines.                                                     |

Custom delimiters make the comma plain data: under `{ delimiter: ";" }` the
field `a,b` stays unquoted on output and is parsed back as one field.
