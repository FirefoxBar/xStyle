// parse mozilla format, return sections
function parseMozillaFormat(css) {
	const docParams = ['@-moz-document ', "@-moz-document\n", "@-moz-document\r\n"];
	let allSection = [{
		"urls": [],
		"urlPrefixes": [],
		"domains": [],
		"regexps": [],
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
		let nextComment = mozStyle.indexOf('/*', currentIndex);
		if (nextComment === -1){
			nextComment = nextMoz;
		}
		let nextQuote = mozStyle.indexOf('"', currentIndex);
		if (nextQuote === -1){
			nextQuote = nextMoz;
		}
		currentIndex = Math.min(nextMoz, nextComment, nextQuote);
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
	// find @-moz-document(space) or @-moz-document(\n)
	function findMozDocument(str, index) {
		let min = -1;
		for (let i = 0; i < docParams.length; i++) {
			let t = str.indexOf(docParams[i], index || 0);
			if (t >= 0 && (min === -1 || min > t)) {
				min = t;
			}
		}
		return min;
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
		f = f.replace('@-moz-document', '');
		if (f === '') {
			return;
		}
		let section = {
			"urls": [],
			"urlPrefixes": [],
			"domains": [],
			"regexps": [],
			"code": ""
		};
		while (true) {
			let i = 0;
			do {
				f = trimNewLines(f).replace(/^,/, '').replace(/^\/\*(.*?)\*\//, '');
				if (i++ > 30) {
					console.error(f.substr(0, 20));
					throw new Error("Timeout. May be is not a legitimate CSS");
				}
			} while (!/^(url|url-prefix|domain|regexp)\((['"]?)(.+?)\2\)/.test(f) && f[0] !== '{');
			let m = f.match(/^(url|url-prefix|domain|regexp)\((['"]?)(.+?)\2\)/);
			if (!m) {
				break;
			}
			f = f.replace(m[0], '');
			let aType = CssToProperty[m[1]];
			let aValue = aType != "regexps" ? m[3] : m[3].replace(/\\\\/g, "\\");
			if (section[aType].indexOf(aValue) < 0) {
				section[aType].push(aValue);
			}
		}
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
		if (f[0] === '{') {
			section.code = trimNewLines(f.substr(1, index - 2));
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
		if (!section.urls.length && !section.urlPrefixes.length && !section.domains.length && !section.regexps.length) {
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


// less compatibility
function cssToLess(code) {
	code = code.replace(/calc\((.*?)\)(!imp| !im|;|[ ]?\}|\n)/g, 'calc(~"$1")$2');
	return code;
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


// Compile less to css
function compileLess(content) {
	return new Promise((resolve, reject) => {
		if (typeof(less) === 'undefined') {
			resolve(content);
			return;
		}
		less.render(content, function (e, output) {
			if (e) {
				reject(e);
			} else {
				resolve(output.css);
			}
		});
	});
}

// Convect css to a special format for storage
function compileCss(css, options) {
	if (options === undefined) {
		options = CleanCSSOptions;
	}
	// Minify CSS
	return new Promise((resolve, reject) => {
		new CleanCSS(options).minify(css, function(error, output) {
			if (!output) {
				reject(error);
			} else {
				resolve(parseMozillaFormat(output.styles));
			}
		});
	});
}

// Parse a style file
function parseStyleFile(code, options) {
	if (options === undefined) {
		options = {};
	}
	return new Promise((resolve, reject) => {
		let result = {
			type: "less",
			lastModified: new Date().getTime(),
			name: "",
			enabled: 1,
			updateUrl: "",
			code: "",
			sections: null,
			advanced: {"item": {}, "saved": {}}
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
			resolve(result);
		};
		const getAdvancedSaved = (k, items) => {
			// init saved
			// 1. if the original style is set, the original setting is used
			// 2. if the type of this one is text or color, the default is used
			// 3. if the type of this one is dropdown or image, the first option is used
			return (typeof(options.advanced) !== 'undefined' && typeof(options.advanced[k]) !== 'undefined' ? 
				options.advanced[k] : 
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
			// Advanced
			if (Object.keys(meta.advanced).length > 0) {
				result.advanced.item = meta.advanced;
				let saved = {};
				for (let k in meta.advanced) {
					saved[k] = getAdvancedSaved(k, meta.advanced);
				}
				result.advanced.saved = saved;
				body = applyAdvanced(body, meta.advanced, saved);
			}
			if (meta.type === 'less') {
				// less
				compileLess(body).then((css) => {
					compileCss(css).then((sections) => {
						result.sections = sections;
						finishParse();
					});
				}).catch((e) => {
					reject("Error: " + e.message + "\nAt line " + e.line + " column " + e.column);
				});
			} else {
				// normal css
				result.code = cssToLess(result.code);
				compileCss(body).then((sections) => {
					result.sections = sections;
					finishParse();
				});
			}
		} else {
			// json file or normal css file
			try {
				let json = JSON.parse(code);
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
				if (json.advanced.css.length > 0) {
					result.advanced.item = json.advanced.item;
					let saved = {};
					for (let k in json.advanced.item) {
						saved[k] = getAdvancedSaved(k, json.advanced.item);
					}
					result.advanced.saved = saved;
					body = applyAdvanced(body, json.advanced.item, saved);
				}
				if (json.type === 'less') {
					// less
					compileLess(body).then((css) => {
						compileCss(css).then((sections) => {
							result.sections = sections;
							finishParse();
						});
					}).catch((e) => {
						reject("Error: " + e.message + "\nAt line " + e.line + " column " + e.column);
					});
				} else {
					// normal css
					result.code = cssToLess(result.code);
					compileCss(body).then((sections) => {
						result.sections = sections;
						finishParse();
					});
				}
			} catch (e) {
				result.code = cssToLess(code);
				let body = code;
				if (typeof(options.advanced) !== 'undefined' && Object.keys(options.advanced.item).length > 0) {
					let saved = {};
					for (let k in options.advanced.item) {
						saved[k] = getAdvancedSaved(k, options.advanced.item);
					}
					body = applyAdvanced(body, options.advanced.item, saved);
				}
				compileCss(body).then((sections) => {
					result.sections = sections;
					finishParse();
				});
			}
		}
	});
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
	var properties = ["code", "urlPrefixes", "urls", "domains", "regexps"];
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