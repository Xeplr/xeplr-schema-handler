// Derive a schema (or schema fragment) from an actual value at runtime.
// Powers "learn missing fields" and "dynamic" modes for output schemas.

function inferType(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  if (v instanceof Date) return 'date';
  return typeof v;
}

// Given an object, return { key: {type} } for each own key.
function schemaFromObject(obj) {
  var out = {};
  if (!obj || typeof obj !== 'object') return out;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) out[keys[i]] = { type: inferType(obj[keys[i]]) };
  return out;
}

// Merge fresh into current keeping every key already in current (learn mode).
function mergeSchemas(current, fresh) {
  current = current || {};
  fresh = fresh || {};
  var next = Object.assign({}, current);
  var keys = Object.keys(fresh);
  for (var i = 0; i < keys.length; i++) {
    if (!next[keys[i]]) next[keys[i]] = fresh[keys[i]];
  }
  return next;
}

function schemasEqual(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

module.exports = {
  inferType: inferType,
  schemaFromObject: schemaFromObject,
  mergeSchemas: mergeSchemas,
  schemasEqual: schemasEqual
};
