(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
		mod(require("../../lib/codemirror"));
	else if (typeof define == "function" && define.amd) // AMD
		define(["../../lib/codemirror"], mod);
	else // Plain browser env
		mod(CodeMirror);
})(function(CodeMirror) {
"use strict";
CodeMirror.registerHelper('lint', 'stylelint', (code, callback) => {
	stylelint.lint({
		code,
		config: stylelintConfig,
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