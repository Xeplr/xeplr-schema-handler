var types = require('./lib/types');
var errors = require('./lib/errors');
var validate = require('./lib/validate');
var inference = require('./lib/inference');
var mapping = require('./lib/mapping');
var templating = require('./lib/templating');

module.exports = {
  // Types
  TYPES: types.TYPES,
  CHECKERS: types.CHECKERS,
  check: types.check,

  // Errors
  ValidationError: errors.ValidationError,

  // Validation
  applySchema: validate.applySchema,

  // Inference (learn / dynamic schema updates)
  inferType: inference.inferType,
  schemaFromObject: inference.schemaFromObject,
  mergeSchemas: inference.mergeSchemas,
  schemasEqual: inference.schemasEqual,

  // Mapping (dotted paths + resolve)
  getPath: mapping.getPath,
  resolveMapping: mapping.resolveMapping,

  // Templating ({name} interpolation)
  interpolate: templating.interpolate,
  interpolateAll: templating.interpolateAll
};
