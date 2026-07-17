// Structured validation failure. `details` is an array of per-field messages
// so the caller can render field-level UI errors, not just one blob.
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details || [];
  }
}

module.exports = { ValidationError: ValidationError };
