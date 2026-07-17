var { check } = require('./types');
var { ValidationError } = require('./errors');

/**
 * Apply a schema (array of field definitions) to a values object.
 * Returns a copy of `values` with defaults filled in.
 * Throws ValidationError listing every problem.
 *
 * Field:  { name, type, required, default, description, order }
 * Values: { [name]: value }
 * Label:  free-form string used in error messages, e.g. 'config' | 'input' | 'params'
 */
function applySchema(schema, values, label) {
  values = values || {};
  label = label || 'field';
  var out = {};
  var errors = [];

  if (!Array.isArray(schema)) return Object.assign({}, values);

  for (var i = 0; i < schema.length; i++) {
    var field = schema[i];
    if (!field || !field.name) continue;

    var val = values[field.name];
    var missing = val === undefined || val === null;

    if (missing && field.default !== undefined) { out[field.name] = field.default; continue; }
    if (missing) {
      if (field.required) errors.push('Missing required ' + label + ' field: ' + field.name);
      continue;
    }
    if (field.type && !check(field.type, val)) {
      errors.push(label + ' field "' + field.name + '" expected type ' + field.type + ', got ' + typeof val);
      continue;
    }
    out[field.name] = val;
  }

  if (errors.length) throw new ValidationError(errors.join('; '), errors);
  return out;
}

module.exports = { applySchema: applySchema };
