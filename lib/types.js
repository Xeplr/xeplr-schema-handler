// The one canonical set of supported types + runtime type predicates.
// Used by validate.js (input checking) and inference.js (typeof-based inference).

var TYPES = ['string', 'number', 'boolean', 'date', 'object', 'array'];

var CHECKERS = {
  string:  function(v) { return typeof v === 'string'; },
  number:  function(v) { return typeof v === 'number' && !isNaN(v); },
  boolean: function(v) { return typeof v === 'boolean'; },
  date:    function(v) { return v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v))); },
  object:  function(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date); },
  array:   function(v) { return Array.isArray(v); }
};

function check(type, value) {
  var fn = CHECKERS[type];
  return fn ? fn(value) : true; // unknown type → don't reject
}

module.exports = { TYPES: TYPES, CHECKERS: CHECKERS, check: check };
