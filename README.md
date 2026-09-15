# @xeplr/schema-handler

**A field schema, and what to do with one.** A schema is a plain array of field definitions — `{ name, type, required, default, options, validation }`. This package checks a values object against it (filling defaults, collecting every problem into one `ValidationError`), infers a schema from a live object, resolves dotted-path mappings, and fills `{placeholder}` templates.

It has no dependencies and no I/O, so the same schema can be checked in the browser and on the server. `@xeplr/factory` validates every record save through `applySchema` with the screen's own fields, and `@xeplr/actions` validates an action's input the same way — so the server accepts exactly what the form does.

## Install

```sh
npm i @xeplr/schema-handler
```

No dependencies, no peers. CommonJS (see [CommonJS / ESM](#commonjs--esm)).

## Quick start

```js
var { applySchema, ValidationError } = require('@xeplr/schema-handler')

var schema = [
  { name: 'title',    type: 'string', required: true, validation: { maxLength: 10 } },
  { name: 'priority', type: 'string', options: ['low', 'high'], default: 'low' },
  { name: 'qty',      type: 'number', validation: { min: 1, integer: true } }
]

applySchema(schema, { title: 'Plant', qty: 3, extra: 1 })
// → { title: 'Plant', priority: 'low', qty: 3 }        default filled, `extra` dropped

try {
  applySchema(schema, { title: 'Plant seeds now', qty: 1.5, priority: 'mid' }, 'task')
} catch (err) {
  err instanceof ValidationError   // true
  err.details
  // [ { field: 'title',    message: 'task field "title" must be at most 10 characters' },
  //   { field: 'priority', message: 'task field "priority" must be one of: low, high' },
  //   { field: 'qty',      message: 'task field "qty" must be an integer' } ]
}
```

## API

| export | signature | does |
|---|---|---|
| `applySchema` | `(schema, values, label?) → object` | Validates `values` against `schema`; returns a new object with defaults filled. Throws `ValidationError` listing every problem. |
| `ValidationError` | `class extends Error` — `new ValidationError(message, details?)` | `name: 'ValidationError'`, `details: [{ field, message }]`. |
| `TYPES` | `string[]` | `['string', 'number', 'boolean', 'date', 'object', 'array']` |
| `CHECKERS` | `{ [type]: (value) → boolean }` | The runtime predicate for each type in `TYPES`. |
| `check` | `(type, value) → boolean` | Runs `CHECKERS[type]`; an unknown type returns `true`. |
| `inferType` | `(value) → string` | `'null'` (null/undefined), `'array'`, `'date'` (a `Date`), else `typeof value`. |
| `schemaFromObject` | `(obj) → { [key]: { type } }` | One entry per own key, typed with `inferType`. Non-objects give `{}`. |
| `mergeSchemas` | `(current, fresh) → object` | Copy of `current` plus keys of `fresh` that `current` lacks. Existing keys are never overwritten. |
| `schemasEqual` | `(a, b) → boolean` | `JSON.stringify(a \|\| {}) === JSON.stringify(b \|\| {})` — key order matters. |
| `getPath` | `(obj, path) → any` | Reads a dotted path (`'user.tags.1'`); `undefined` if any step is missing. |
| `resolveMapping` | `(mapping, source) → object` | `{ target: 'dotted.path' }` → `{ target: value }`. Missing paths give `undefined`. |
| `interpolate` | `(template, context) → string` | Replaces `{path}` with `getPath(context, path)`. |
| `interpolateAll` | `(value, context) → any` | `interpolate` on every string inside objects and arrays; other values returned as-is. |

Note that `schemaFromObject` / `mergeSchemas` / `schemasEqual` work on a **keyed** schema (`{ key: { type } }`), not the field array `applySchema` takes. They exist for "learn missing fields" and "dynamic" output schemas.

## The schema

`applySchema` takes an **array** of fields. Anything that is not an array is not a schema: `applySchema(null, values)` returns a shallow copy of `values`, unchecked.

| key | | |
|---|---|---|
| `name` | required | The key in `values`. A field without a `name` is skipped. |
| `type` | optional | One of `TYPES`. An unknown type, or none, accepts any value. |
| `required` | optional | Missing (`undefined` or `null`) with no `default` is an error. |
| `default` | optional | Used when the value is missing. Not type-checked or validated. Wins over `required`. |
| `options` | optional | `[value, …]` or `[{ value, label }, …]`. The value must be one of them (strict `===`). |
| `validation` | optional | Per-type constraints, below. |
| `description`, `order` | ignored | Carried for forms; not read here. |
| `group`, `showWhen` | ignored | Form layout only — see [Rules](#rules-the-code-enforces). |

### Types

| type | accepts |
|---|---|
| `string` | `typeof v === 'string'` |
| `number` | `typeof v === 'number'` and not `NaN` — the string `'3'` is **not** a number |
| `boolean` | `typeof v === 'boolean'` |
| `date` | a `Date`, or a string `Date.parse` understands |
| `object` | non-null object that is not an array and not a `Date` |
| `array` | `Array.isArray(v)` |

### `validation`

Checked only after the value passed its `type`, and only for these types:

| type | keys |
|---|---|
| `string` | `minLength`, `maxLength`, `pattern` (a string passed to `new RegExp`) |
| `number` | `min`, `max`, `integer` |
| `date` | `min`, `max` — ISO strings, compared as `Date`s, inclusive |
| `array` | `minItems`, `maxItems`, `itemType` (each item checked with `check`; errors keyed `tags[1]`) |
| `object` | `fields: [...]` — a nested schema, applied recursively |

A nested object's result is the nested `applySchema` output (so its defaults are filled and its unknown keys dropped). Its errors are re-keyed `parent.child`:

```js
applySchema(
  [{ name: 'address', type: 'object', validation: { fields: [{ name: 'city', type: 'string', required: true }] } }],
  { address: {} }, 'task')
// throws; details: [ { field: 'address.city', message: 'Missing required task.address field: city' } ]
```

### What comes back

- Only fields named in the schema. **Keys not in the schema are dropped.**
- A missing value with a `default` → the default. A missing value without one → the key is absent.
- An empty string is a value, not missing.

## Errors

`applySchema` checks every field, then throws **one** `ValidationError` if anything failed:

| property | |
|---|---|
| `name` | `'ValidationError'` |
| `message` | every message joined with `'; '` — for logs |
| `details` | `[{ field, message }]`, one per problem — for field-level UI |

Per field, the first failing stage wins: missing → type → options → constraints. A type error stops that field's other checks; several constraint failures on one field are all reported.

The `label` argument (default `'field'`) goes into every message:

| problem | message |
|---|---|
| required, missing | `Missing required <label> field: <name>` |
| wrong type | `<label> field "<name>" expected type <type>, got <typeof value>` |
| not an option | `<label> field "<name>" must be one of: a, b` |
| `minLength` / `maxLength` | `… must be at least N characters` / `… must be at most N characters` |
| `pattern` | `… does not match the required pattern` |
| `min` / `max` (number) | `… must be >= N` / `… must be <= N` |
| `integer` | `… must be an integer` |
| `min` / `max` (date) | `… must be on or after <min>` / `… must be on or before <max>` |
| `minItems` / `maxItems` | `… must have at least N items` / `… must have at most N items` |
| `itemType` | `<label> field "<name>[i]" expected type <itemType>` |

With the default label messages read `Missing required field field: title`; callers pass their own (`'input'`, `'config'`, `'params'`).

Not a `ValidationError`: an invalid `validation.pattern` makes `new RegExp` throw its own `SyntaxError`.

`details` is shaped so it can be turned straight into `@xeplr/ui-schema-handler`'s `DynamicForm` `errors` prop (`{ [name]: message }`) without parsing a field name back out of a sentence.

## Mapping and templating

```js
var { resolveMapping, interpolate, interpolateAll } = require('@xeplr/schema-handler')

resolveMapping({ who: 'user.name', age: 'user.age' }, { user: { name: 'Ann' } })
// → { who: 'Ann', age: undefined }

interpolate('Hi {user.name}, {{literal}} {missing}! {user}', { user: { name: 'Ann' } })
// → 'Hi Ann, {literal} ! {"name":"Ann"}'

interpolateAll({ subject: 'Hi {name}', n: 3, list: ['{name}', true] }, { name: 'Ann' })
// → { subject: 'Hi Ann', n: 3, list: ['Ann', true] }
```

| in a template | renders |
|---|---|
| `{a.b.c}` | the value at that dotted path (whitespace inside the braces trimmed) |
| a path that is `undefined` / `null` | `''` |
| an object or array | `JSON.stringify(value)` |
| `{{` / `}}` | a literal `{` / `}` |
| `template` is `null` / `undefined` | `''` |

Paths are split on `.` only, so array items are `items.0`, not `items[0]`.

## CommonJS / ESM

The package is CommonJS (`main: index.js`, no `exports` map).

```js
var { applySchema } = require('@xeplr/schema-handler')
```

From ESM, use the **default import**. Node's CommonJS export detection cannot see this file's `name: lib.fn` properties, so named imports (other than `TYPES`) fail:

```js
import schemaHandler from '@xeplr/schema-handler'
const { applySchema, ValidationError } = schemaHandler
```

## Rules the code enforces

| rule | why |
|---|---|
| All problems are collected, then thrown once | A form can show every field's error at once instead of one per submit. |
| `details` is `[{ field, message }]`, `message` a joined string | Field-level UI needs the field; logs need one string. Neither should parse the other. |
| `group` is ignored when validating | It only draws fields together in a collapsible section. A collapsed section's values are submitted and checked like any other — "did the user have this section open" must never be part of what the server accepts. |
| `showWhen` is ignored when validating | Layout only: it decides whether a field is asked at all. Use `showWhen` for a branch, `group` for the tail of rarely-set options. |
| `options` is the constraint | A radio/select's option list is not declared again as a separate rule — one source of truth rather than two that can drift. |
| `validation` runs only after `type` passed | Constraints like `.length` or `<` are meaningless on the wrong type. |
| Nested errors keyed `parent.child` | A flat `details` array still says exactly which leaf failed. |
| Unknown `type` accepts the value | `check` does not reject what it does not know. |

## Tests

This package has no test suite and no `test` script (CI reports "No test script — nothing verified."). It is exercised through its consumers, e.g. `@xeplr/factory`'s `npm test`.

## License

MIT
