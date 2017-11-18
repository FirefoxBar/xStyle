(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
		mod(require("../../lib/codemirror"));
	else if (typeof define == "function" && define.amd) // AMD
		define(["../../lib/codemirror"], mod);
	else // Plain browser env
		mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

let config = (defaultSeverity => ({
  // 'sugarss' is a indent-based syntax like Sass or Stylus
  // ref: https://github.com/postcss/postcss#syntaxes
  syntax: 'sugarss',
  // ** recommended rules **
  // ref: https://github.com/stylelint/stylelint-config-recommended/blob/master/index.js
  rules: {
    'at-rule-no-unknown': [true, defaultSeverity],
    'block-no-empty': [true, defaultSeverity],
    'color-no-invalid-hex': [true, defaultSeverity],
    'declaration-block-no-duplicate-properties': [true, {
      'ignore': ['consecutive-duplicates-with-different-values'],
      'severity': 'warning'
    }],
    'declaration-block-no-shorthand-property-overrides': [true, defaultSeverity],
    'font-family-no-duplicate-names': [true, defaultSeverity],
    'function-calc-no-unspaced-operator': [true, defaultSeverity],
    'function-linear-gradient-no-nonstandard-direction': [true, defaultSeverity],
    'keyframe-declaration-no-important': [true, defaultSeverity],
    'media-feature-name-no-unknown': [true, defaultSeverity],
    /* recommended true */
    'no-extra-semicolons': [true, defaultSeverity],
    'no-invalid-double-slash-comments': [true, defaultSeverity],
    'property-no-unknown': [true, defaultSeverity],
    'selector-pseudo-class-no-unknown': [true, defaultSeverity],
    'selector-pseudo-element-no-unknown': [true, defaultSeverity],
    'selector-type-no-unknown': true, // for scss/less/stylus-lang
    'string-no-newline': [true, defaultSeverity],
    'unit-no-unknown': [true, defaultSeverity],

  }
}))({severity: 'warning'});

CodeMirror.registerHelper('lint', 'stylelint', (code, callback) => {
	stylelint.lint({
		code,
		config: config,
	}).then(({results}) => {
		if (!results[0]) {
			callback([]);
		}
		callback(results[0].warnings.map(warning => ({
			from: CodeMirror.Pos(warning.line - 1, warning.column - 1),
			to: CodeMirror.Pos(warning.line - 1, warning.column),
			message: warning.text
				.replace('Unexpected ', '')
				.replace(/^./, firstLetter => firstLetter.toUpperCase())
				.replace(/\s*\([^(]+\)$/, ''), // strip the rule,
			rule: warning.text.replace(/^.*?\s*\(([^(]+)\)$/, '$1'),
			severity : warning.severity
		})));
	})
});

});