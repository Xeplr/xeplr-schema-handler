// Structured validation failure. `details` is an array of { field, message }
// — one entry per problem, keyed by which field it belongs to — so a caller
// can render field-level UI errors (e.g. feed straight into
// @xeplr/ui-schema-handler's DynamicForm `errors` prop, which wants
// { [name]: message }) rather than having to parse a field name back out of
// a sentence. `message` (from the Error base) stays a single joined string
// for anything that just wants to log or throw it.
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details || [];
  }
}

module.exports = { ValidationError: ValidationError };
