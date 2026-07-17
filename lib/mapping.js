// Resolve a mapping — { targetName: 'source.dotted.path' } — against a source
// object. Returns { targetName: value }. Missing paths yield `undefined`.

function getPath(obj, path) {
  if (obj == null || !path) return undefined;
  var parts = String(path).split('.');
  var cur = obj;
  for (var i = 0; i < parts.length; i++) {
    if (cur == null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function resolveMapping(mapping, source) {
  var out = {};
  if (!mapping) return out;
  var keys = Object.keys(mapping);
  for (var i = 0; i < keys.length; i++) out[keys[i]] = getPath(source, mapping[keys[i]]);
  return out;
}

module.exports = { resolveMapping: resolveMapping, getPath: getPath };
