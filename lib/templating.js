// Simple placeholder interpolation. `{name}` and `{a.b.c}` are resolved
// against `context` via dotted paths. Unknown paths render as empty string.
// Use `{{` and `}}` for literal braces.

var { getPath } = require('./mapping');

var OPEN_SENTINEL = '';
var CLOSE_SENTINEL = '';

function interpolate(template, context) {
  if (template == null) return '';
  var str = String(template)
    .split('{{').join(OPEN_SENTINEL)
    .split('}}').join(CLOSE_SENTINEL);
  str = str.replace(/\{([^{}]+)\}/g, function(_, path) {
    var v = getPath(context, path.trim());
    if (v === undefined || v === null) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
  return str.split(OPEN_SENTINEL).join('{').split(CLOSE_SENTINEL).join('}');
}

// Recursively interpolate all string values in a structure. Objects and
// arrays are walked; primitives other than strings are returned as-is.
function interpolateAll(value, context) {
  if (value == null) return value;
  if (typeof value === 'string') return interpolate(value, context);
  if (Array.isArray(value)) return value.map(function(v) { return interpolateAll(v, context); });
  if (typeof value === 'object') {
    var out = {};
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) out[keys[i]] = interpolateAll(value[keys[i]], context);
    return out;
  }
  return value;
}

module.exports = { interpolate: interpolate, interpolateAll: interpolateAll };
