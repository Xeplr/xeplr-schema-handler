var { check } = require('./types');
var { ValidationError } = require('./errors');

/**
 * Apply a schema (array of field definitions) to a values object.
 * Returns a copy of `values` with defaults filled in.
 * Throws ValidationError listing every problem (details: [{ field, message }]).
 *
 * Field:  { name, type, required, default, description, order,
 *           group?,       // FORM LAYOUT ONLY — ignored here, and deliberately
 *                          // so. Fields naming the same group are drawn
 *                          // together in one collapsible section, which is
 *                          // how a 13-input action stops reading as a tax
 *                          // return. It says nothing about validity: a
 *                          // collapsed group's values are submitted and
 *                          // checked exactly like any other, because "did the
 *                          // user happen to have this section open" must never
 *                          // be part of what the server accepts.
 *                          //
 *                          // Distinct from `showWhen` (also layout-only, also
 *                          // ignored here), which decides whether a field is
 *                          // ASKED AT ALL. Rule of thumb: showWhen for a
 *                          // branch — picking a template means there is no
 *                          // subject to write — and group for the tail of
 *                          // always-legitimate options nobody sets most days.
 *           options?,     // [value, ...] or [{value, label}, ...] — if
 *                          // present, the value MUST be one of them. Not
 *                          // declared separately from a radio/select
 *                          // widget's own option list — that list IS the
 *                          // constraint, one source of truth rather than two
 *                          // that can drift apart.
 *           validation? }  // per-type constraints, only checked once the
 *                          // base type already passed `check()`:
 *                          //   string: { minLength, maxLength, pattern }
 *                          //   number: { min, max, integer }
 *                          //   date:   { min, max }            (ISO strings)
 *                          //   array:  { minItems, maxItems, itemType }
 *                          //   object: { fields: [...] }       (nested schema,
 *                          //           validated recursively — this is the
 *                          //           "nested sub-forms" DynamicForm's own
 *                          //           comment flags as not built yet; the
 *                          //           data layer doesn't need to wait on it)
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
      if (field.required) errors.push({ field: field.name, message: 'Missing required ' + label + ' field: ' + field.name });
      continue;
    }
    if (field.type && !check(field.type, val)) {
      errors.push({ field: field.name, message: label + ' field "' + field.name + '" expected type ' + field.type + ', got ' + typeof val });
      continue;
    }

    if (field.options && field.options.length) {
      var allowed = optionValues(field.options);
      if (allowed.indexOf(val) === -1) {
        errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be one of: ' + allowed.join(', ') });
        continue;
      }
    }

    if (field.type === 'object' && field.validation && Array.isArray(field.validation.fields)) {
      applyNestedObject(field, val, label, errors, out);
      continue;
    }

    checkConstraints(field, val, label, errors);
    out[field.name] = val;
  }

  if (errors.length) {
    throw new ValidationError(errors.map(function(e) { return e.message; }).join('; '), errors);
  }
  return out;
}

function optionValues(options) {
  return options.map(function(o) {
    return (o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, 'value')) ? o.value : o;
  });
}

function checkConstraints(field, val, label, errors) {
  var v = field.validation;
  if (!v) return;

  if (field.type === 'string') {
    if (v.minLength != null && val.length < v.minLength) {
      errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be at least ' + v.minLength + ' characters' });
    }
    if (v.maxLength != null && val.length > v.maxLength) {
      errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be at most ' + v.maxLength + ' characters' });
    }
    if (v.pattern && !(new RegExp(v.pattern)).test(val)) {
      errors.push({ field: field.name, message: label + ' field "' + field.name + '" does not match the required pattern' });
    }
  } else if (field.type === 'number') {
    if (v.min != null && val < v.min) errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be >= ' + v.min });
    if (v.max != null && val > v.max) errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be <= ' + v.max });
    if (v.integer && !Number.isInteger(val)) errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be an integer' });
  } else if (field.type === 'date') {
    var d = val instanceof Date ? val : new Date(val);
    if (v.min && d < new Date(v.min)) errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be on or after ' + v.min });
    if (v.max && d > new Date(v.max)) errors.push({ field: field.name, message: label + ' field "' + field.name + '" must be on or before ' + v.max });
  } else if (field.type === 'array') {
    if (v.minItems != null && val.length < v.minItems) {
      errors.push({ field: field.name, message: label + ' field "' + field.name + '" must have at least ' + v.minItems + ' items' });
    }
    if (v.maxItems != null && val.length > v.maxItems) {
      errors.push({ field: field.name, message: label + ' field "' + field.name + '" must have at most ' + v.maxItems + ' items' });
    }
    if (v.itemType) {
      for (var j = 0; j < val.length; j++) {
        if (!check(v.itemType, val[j])) {
          errors.push({ field: field.name + '[' + j + ']', message: label + ' field "' + field.name + '[' + j + ']" expected type ' + v.itemType });
        }
      }
    }
  }
}

// Recursive: nested errors are re-keyed as "<parent>.<child>" so a flat
// details array still says exactly which leaf failed.
function applyNestedObject(field, val, label, errors, out) {
  try {
    out[field.name] = applySchema(field.validation.fields, val, label + '.' + field.name);
  } catch (err) {
    (err.details || []).forEach(function(d) {
      errors.push({ field: field.name + '.' + d.field, message: d.message });
    });
  }
}

module.exports = { applySchema: applySchema };
