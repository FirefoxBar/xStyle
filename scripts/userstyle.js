// parse mozilla format, return sections
function parseMozillaFormat(css) {
	const docParams = ['@-moz-document ', "@-moz-document\n", "@-moz-document\r\n"];
	let allSection = [{
		"urls": [],
		"urlPrefixes": [],
		"domains": [],
		"regexps": [],
		"exclude": [],
		"code": ""
	}];
	let mozStyle = trimNewLines(css.replace(/@namespace url\((.*?)\);/g, ""));
	let currentIndex = findMozDocument(mozStyle, 0);
	let lastIndex = currentIndex;
	if (currentIndex !== 0) {
		if (currentIndex > 0) {
			allSection[0].code += "\n" + trimNewLines(mozStyle.substr(0, currentIndex - 1));
		} else {
			allSection[0].code += trimNewLines(mozStyle);
		}
	}
	// split by @-moz-document
	while (findMozDocument(mozStyle, currentIndex) >= 0) {
		currentIndex++;
		// Jump to next
		let nextMoz = findMozDocument(mozStyle, currentIndex)
		let nextQuote = mozStyle.indexOf('"', currentIndex);
		if (nextQuote === -1){
			nextQuote = nextMoz;
		}
		currentIndex = Math.min(nextMoz, nextQuote);
		if (currentIndex < 0) {
			parseOneSection(mozStyle.substr(lastIndex));
			break;
		}
		currentIndex = ignoreSomeCodes(mozStyle, currentIndex);
		if (findMozDocument(mozStyle, currentIndex) === currentIndex) {
			parseOneSection(mozStyle.substr(lastIndex, currentIndex - lastIndex));
			lastIndex = currentIndex;
		}
	}
	// remove global section if it is empty
	allSection[0].code = trimNewLines(allSection[0].code);
	if (allSection[0].code === '') {
		allSection.splice(0, 1);
	}
	return allSection;
	// find @-moz-document(space)
	function findMozDocument(str, index) {
		return str.indexOf('@-moz-document ', index || 0);
	}
	function ignoreSomeCodes(f, index) {
		// ignore quotation marks
		if (f[index] === '"') {
			index++;
			do {
				index = f.indexOf('"', index);
				index++;
			} while (f[index - 2] === '\\');
		}
		if (f[index] === "'") {
			index++;
			do {
				index = f.indexOf("'", index);
				index++;
			} while (f[index - 2] === '\\');
		}
		return index;
	}
	function parseOneSection(f) {
		const matchReg = /^(url|url-prefix|domain|regexp|exclude)([ \t]*)\((['"]?)(.+?)\3\)/;
		f = trimNewLines(f.replace('@-moz-document', ''));
		if (f === '') {
			return;
		}
		let section = {
			"urls": [],
			"urlPrefixes": [],
			"domains": [],
			"regexps": [],
			"exclude": [],
			"code": ""
		};
		while (true) {
			let i = 0;
			do {
				f = trimNewLines(f).replace(/^,/, '');
				if (i++ > 30) {
					console.error(f.substr(0, 50));
					throw new Error("Parse timeout, maybe is not a legitimate CSS, please check console for more information");
				}
			} while (!matchReg.test(f) && f[0] !== '{');
			let m = f.match(matchReg);
			if (!m) {
				break;
			}
			f = f.replace(m[0], '');
			let aType = CssToProperty[m[1]];
			let aValue = (aType != "regexps" && aType != "exclude") ? m[4] : m[4].replace(/\\\\/g, "\\");
			if (section[aType].indexOf(aValue) < 0) {
				section[aType].push(aValue);
			}
		}
		if (f[0] === '{') {
			// split this section
			let index = 0;
			let leftCount = 0;
			while (index < f.length - 1) {
				index = ignoreSomeCodes(f, index);
				if (f[index] === '{') {
					leftCount++;
				} else if (f[index] === '}') {
					leftCount--;
				}
				index++;
				if (leftCount <= 0) {
					break;
				}
			}
			section.code = trimNewLines(f.substr(1, index - 1));
			if (index < f.length - 1) {
				allSection[0].code += "\n" + trimNewLines(f.substr(index));
			}
		} else {
			section.code = trimNewLines(f);
		}
		addSection(section);
	}
	function addSection(section) {
		// don't add empty sections
		if (!section.code) {
			return;
		}
		if (!section.urls.length && !section.urlPrefixes.length && !section.domains.length && !section.regexps.length && !section.exclude) {
			allSection[0].code += "\n" + section.code;
		} else {
			allSection.push(section);
		}
	}
}

// Parse meta information of .user.css format
function parseStyleMeta(f) {
	let alias = {"updateURL": "updateUrl", "md5URL": "md5Url", "homepageURL": "url", "originalMD5": "originalMd5"};
	let oneRegexp = /@(name|homepageURL|updateURL|md5URL|originalMD5|author|advanced)([ \t]+)(.*)/;
	let advancedRegexp = /^(text|color|image|dropdown)([ \t]+)(.*?)([ \t]+)"(.*?)"([ \t]+)(.*)/;
	let imageItemRegexp = /([a-zA-Z0-9\-_]+)([ \t]+)"(.*?)"([ \t]+)"(.*?)"/;
	let dropdownItemRegexp = /([a-zA-Z0-9\-_]+)([ \t]+)"(.*?)"([ \t]+)<<<EOT([\s\S]+?)EOT;/;
	let currentIndex = 0;
	let result = {"advanced": {}};
	// replace %22 with "
	function replaceQuote(s) {
		return s.replace(/%22/g, '"');
	}
	// split by @
	f = "\n" + f;
	while ((currentIndex = f.indexOf("\n@", currentIndex)) >= 0) {
		let t = null;
		currentIndex++;
		let nextIndex = f.indexOf("\n", currentIndex);
		if (nextIndex < 0) {
			nextIndex = f.length - 1;
		}
		if ((t = f.substr(currentIndex, nextIndex - currentIndex + 1).match(oneRegexp, currentIndex)) !== null) {
			let k = t[1];
			if (k === 'advanced') {
				let sp = t[3].match(advancedRegexp);
				if (sp[1] === 'text') {
					result.advanced[sp[3]] = {"type": sp[1], "title": replaceQuote(sp[5]), "default": replaceQuote(sp[7].replace(/^"/, '').replace(/"$/, ''))};
				} else if (sp[1] === 'color') {
					result.advanced[sp[3]] = {"type": sp[1], "title": replaceQuote(sp[5]), "default": sp[7].trim()};
				} else if (sp[1] === 'image') {
					result.advanced[sp[3]] = {"type": sp[1], "title": replaceQuote(sp[5]), "option": {}};
					let start = currentIndex + t[0].length;
					let end = start;
					do {
						end = f.indexOf("\n", end);
						end++;
					} while (f[end] !== '}');
					let options = trimNewLines(f.substr(start, end - start)).split("\n");
					for (let one of options) {
						let option = one.match(imageItemRegexp);
						result.advanced[sp[3]].option[option[1]] = {"title": replaceQuote(option[3]), "value": option[5]};
					}
				} else {
					result.advanced[sp[3]] = {"type": sp[1], "title": replaceQuote(sp[5]), "option": {}};
					let start = currentIndex + t[0].length;
					let end = start;
					while (true) {
						if (f.substr(end, 6) === '<<<EOT') {
							end = f.indexOf('EOT;', end);
							end += 4;
						}
						if (f[end] === '}') {
							break;
						}
						end++;
					}
					let content = f.substr(start, end - start);
					while (dropdownItemRegexp.test(content)) {
						let one = content.match(dropdownItemRegexp);
						content = content.substr(content.indexOf(one[0]) + one[0].length);
						result.advanced[sp[3]].option[one[1]] = {"title": replaceQuote(one[3]), "value": trimNewLines(one[5].replace(/\*\\\//g, '*/'))};
					}
				}
			} else {
				if (typeof(alias[k]) !== 'undefined') {
					k = alias[k];
				}
				result[k] = trimNewLines(t[3]);
			}
		}
	}
	return result;
}

// check md5 for update
function checkStyleUpdateMd5(style) {
	return new Promise((resolve) => {
		if (!style.md5Url || !style.originalMd5) {
			resolve(false);
		}
		getURL(style.md5Url).then((responseText) => {
			if (responseText.length != 32) {
				resolve(false);
			}
			resolve(responseText != style.originalMd5);
		});
	});
};

// update a style
function updateStyleFullCode(style) {
	const update = (style, serverJson) => {
		// update everything but name
		delete serverJson.name;
		serverJson.id = style.id;
		serverJson.method = "saveStyle";
		browser.runtime.sendMessage(serverJson);
	};
	if (!style.updateUrl) {
		return;
	}
	let updateUrl = style.updateUrl;
	// For uso
	if (updateUrl.includes('userstyles.org') && Object.keys(style.advanced.saved).length > 0) {
		let style_id = style.md5Url.match(/\/(\d+)\.md5/)[1];
		getURL('https://userstyles.org/api/v1/styles/' + style_id).then((responseText) => {
			let serverJson = JSON.parse(responseText);
			let rawCss = serverJson.css;
			getURL(style.md5Url).then((md5) => {
				parseStyleFile(rawCss, {
					"name": style.name,
					"md5Url": style.md5Url || null,
					"url": style.url || null,
					"author": style.author || null,
					"originalMd5": md5
				}).then((toSave) => {
					update(style, toSave);
				});
			});
		});
	} else {
		// not uso
		getURL(updateUrl)
		.then(responseText => parseStyleFile(responseText, {
			"name": style.name,
			"advanced": {
				"saved": style.advanced.saved
			}
		}))
		.then((toSave) => {
			if (style.md5Url) {
				getURL(style.md5Url).then((md5) => {
					toSave.originalMd5 = md5;
					update(style, toSave);
				});
			} else {
				update(style, toSave);
			}
		});
	}
}

// Apply advanced to a style
function applyAdvanced(content, item, saved) {
	const getValue = (k, v) => {
		if (typeof(item[k]) === 'undefined') {
			return null;
		}
		switch (item[k].type) {
			case 'text':
			case 'color':
				return v;
			case 'dropdown':
				return item[k].option[v].value;
			case 'image':
				return typeof(item[k].option[v]) === 'undefined' ? v : item[k].option[v].value;
		}
	};
	let isContinue = false;
	do {
		isContinue = false;
		for (let k in saved) {
			const reg = new RegExp('\\/\\*\\[\\[' + k + '\\]\\]\\*\\/', 'g');
			if (reg.test(content)) {
				isContinue = true;
				content = content.replace(reg, getValue(k, saved[k]));
			}
		}
	} while (isContinue);
	return content;
}


// Comile dynamic format like less and more
function CompileDynamic(format, content) {
	return new Promise((resolve, reject) => {
		switch (format) {
			case 'less':
				less.render(content, {
					"strictMath": true
				}).then(e => resolve(e.css))
				.catch(reject);
				break;
			default:
				resolve(content);
		}
	});
}

// Convect css to a special format for storage
function CompileCSS(css, options) {
	if (options === undefined) {
		options = CleanCSSOptions;
	}
	// Minify CSS
	return new Promise((resolve, reject) => {
		new CleanCSS(options).minify(css, function(error, output) {
			if (!output) {
				reject(error);
			} else {
				try {
					resolve(parseMozillaFormat(output.styles));
				} catch (e) {
					reject(e);
				}
			}
		});
	});
}

// Parse a style file
function parseStyleFile(code, options, advanced) {
	if (options === undefined) {
		options = {};
	}
	if (options.advanced !== undefined) {
		advanced = options.advanced;
	}
	if (advanced === undefined) {
		advanced = {"item": {}, "saved": {}};
	}
	if (advanced.item === undefined) {
		advanced.item = {};
	}
	return new Promise((resolve, reject) => {
		let result = {
			type: "css",
			lastModified: new Date().getTime(),
			name: "",
			enabled: 1,
			updateUrl: "",
			code: "",
			sections: null
		};
		const finishParse = () => {
			for (const k in options) {
				if (typeof(options[k]) === 'object') {
					if (typeof(result[k]) === 'undefined') {
						result[k] = {};
					}
					for (const kk in options[k]) {
						result[k][kk] = options[k][kk];
					}
				} else {
					result[k] = options[k];
				}
			}
			result.advanced = advanced;
			resolve(result);
		};
		const getAdvancedSaved = (k, items) => {
			// init saved
			// 1. if the original style is set, the original setting is used
			// 2. if the type of this one is text or color, the default is used
			// 3. if the type of this one is dropdown or image, the first option is used
			return (typeof(advanced.saved[k]) !== 'undefined' ?
				advanced.saved[k] :
				(typeof(items[k].default) === 'undefined' ?
					Object.keys(items[k].option)[0] :
					items[k].default
				)
			);
		};
		code = trimNewLines(code);
		if (code.indexOf('/* ==UserStyle==') === 0) {
			// user css file
			let meta = parseStyleMeta(trimNewLines(code.match(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//)[1]));
			let body = trimNewLines(code.replace(/\/\* ==UserStyle==([\s\S]+)==\/UserStyle== \*\//, ''));
			result.code = body;
			// advanced param is more important than advanced key in json file
			if (Object.keys(advanced.item).length === 0 &&
				meta.advanced !== undefined &&
				Object.keys(meta.advanced).length > 0) {
				advanced.item = meta.advanced;
			}
			// Advanced
			if (Object.keys(advanced.item).length > 0) {
				for (let k in advanced.item) {
					advanced.saved[k] = getAdvancedSaved(k, advanced.item);
				}
				body = applyAdvanced(body, advanced.item, advanced.saved);
			}
			CompileDynamic(meta.type, body).then((css) => {
				CompileCSS(css).then((sections) => {
					result.sections = sections;
					finishParse();
				});
			}).catch((e) => {
				reject("Error: " + e.message + "\nAt line " + e.line + " column " + e.column);
			});
		} else {
			// json file or normal css file
			let json = null;
			try {
				json = JSON.parse(code);
			} catch (e) {
				// normal css file, check if advanced is passed
				result.code = code;
				let body = code;
				if (Object.keys(advanced.item).length > 0) {
					if (Object.keys(advanced.saved).length === 0) {
						for (let k in advanced.item) {
							advanced.saved[k] = getAdvancedSaved(k, advanced.item);
						}
					}
					body = applyAdvanced(body, advanced.item, advanced.saved);
				}
				CompileCSS(body).then((sections) => {
					result.sections = sections;
					finishParse();
				});
				return;
			}
			// json file, continue
			result.name = json.name;
			result.updateUrl = json.updateUrl || "";
			result.code = typeof(json.code) === 'undefined' ? ((codeSections) => {
				return codeSections.map((section) => {
					var cssMds = [];
					for (var i in propertyToCss) {
						if (section[i]) {
							cssMds = cssMds.concat(section[i].map(function (v){
								return propertyToCss[i] + "(\"" + v.replace(/\\/g, "\\\\") + "\")";
							}));
						}
					}
					return cssMds.length ? "@-moz-document " + cssMds.join(", ") + " {\n" + section.code + "\n}" : section.code;
				}).join("\n\n");
			})(json.advanced.css.length > 0 ? json.advanced.css : json.sections) : json.code;
			let body = result.code;
			if (json.advanced.css) {
				delete json.advanced.css;
			}
			// advanced param is more important than advanced key in json file
			if (Object.keys(advanced.item).length === 0 &&
				json.advanced !== undefined &&
				json.advanced.item !== undefined &&
				Object.keys(json.advanced.item).length > 0) {
				advanced.item = json.advanced.item;
			}
			if (Object.keys(advanced.saved).length === 0 &&
				json.advanced !== undefined &&
				json.advanced.saved !== undefined &&
				Object.keys(json.advanced.saved).length > 0) {
				advanced.saved = json.advanced.saved;
			}
			// If this style have advanced options
			if (Object.keys(advanced.item).length > 0) {
				if (Object.keys(advanced.saved).length === 0) {
					// If not have saved, generate it
					for (let k in advanced.item) {
						advanced.saved[k] = getAdvancedSaved(k, advanced.item);
					}
				}
				body = applyAdvanced(body, advanced.item, advanced.saved);
			}
			CompileDynamic(json.type, body).then((css) => {
				CompileCSS(css).then((sections) => {
					result.sections = sections;
					finishParse();
				});
			}).catch((e) => {
				reject("Error: " + e.message + "\nAt line " + e.line + " column " + e.column);
			});
		}
	});
}

// Update style to newest format
function updateStyleFormat(s) {
	// version 2
	if (!s.advanced) {
		s.advanced = {"item": {}, "saved": {}};
	}
	// version 3
	if (!s.lastModified) {
		s.lastModified = new Date().getTime();
	}
	// version 4
	if (!s.type) {
		s.type = 'css';
	}
	if (!s.code) {
		let codeSections = null;
		if (typeof(s.advanced.css) !== 'undefined' && s.advanced.css.length) {
			codeSections = s.advanced.css;
		} else {
			codeSections = s.sections;
		}
		// Add exclude
		for (let i in s.sections) {
			if (typeof(s.sections[i].exclude) === 'undefined') {
				s.sections[i].exclude = [];
			}
		}
		s.code = codeSections.map((section) => {
			var cssMds = [];
			for (var i in propertyToCss) {
				if (section[i]) {
					cssMds = cssMds.concat(section[i].map(function (v){
						return propertyToCss[i] + "(\"" + v.replace(/\\/g, "\\\\") + "\")";
					}));
				}
			}
			return cssMds.length ? "@-moz-document " + cssMds.join(", ") + " {\n" + section.code + "\n}" : section.code;
		}).join("\n\n");
		delete s.advanced.css;
	}
	return s;
}


// two json is equal or not
function jsonEquals(a, b, property) {
	var aProp = a[property], typeA = getType(aProp);
	var bProp = b[property], typeB = getType(bProp);
	if (typeA != typeB) {
		// consider empty arrays equivalent to lack of property
		if ((typeA == "undefined" || (typeA == "array" && aProp.length == 0)) && (typeB == "undefined" || (typeB == "array" && bProp.length == 0))) {
			return true;
		}
		return false;
	}
	if (typeA == "undefined") {
		return true;
	}
	if (typeA == "array") {
		if (aProp.length != bProp.length) {
			return false;
		}
		for (var i = 0; i < aProp.length; i++) {
			if (bProp.indexOf(aProp[i]) == -1) {
				return false;
			}
		}
		return true;
	}
	if (typeA == "string") {
		return aProp == bProp;
	}
};
function codeIsEqual(a, b) {
	if (a.length != b.length) {
		return false;
	}
	var properties = ["code", "urlPrefixes", "urls", "domains", "regexps", "exclude"];
	for (var i = 0; i < a.length; i++) {
		var found = false;
		for (var j = 0; j < b.length; j++) {
			var allEquals = properties.every((property) => {
				return jsonEquals(a[i], b[j], property);
			});
			if (allEquals) {
				found = true;
				break;
			}
		}
		if (!found) {
			return false;
		}
	}
	return true;
};