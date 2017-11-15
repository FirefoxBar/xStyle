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
function parseUCMeta(f) {
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
	let update = (style, serverJson) => {
		// update everything but name
		delete serverJson.name;
		serverJson.id = style.id;
		serverJson.method = "saveStyle";
		browser.runtime.sendMessage(serverJson);
	};
	let saveOneStyle = (style, rawCss, md5) => {
		let toSave = {
			"name": style.name,
			"updateUrl": style.updateUrl,
			"md5Url": style.md5Url || null,
			"url": style.url || null,
			"author": style.author || null,
			"originalMd5": null,
			"advanced": style.advanced,
			"sections": applyAdvanced(rawCss, style.advanced.item, style.advanced.saved)
		};
		if (md5 !== null) {
			toSave.originalMd5 = md5;
		}
		update(style, toSave);
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
			let rawCss = parseMozillaFormat(serverJson.css);
			getURL(style.md5Url).then((md5) => {
				saveOneStyle(style, rawCss, md5);
			});
		});
	} else {
		// not uso
		getURL(updateUrl).then((responseText) => {
			let serverJson = null;
			try {
				serverJson = JSON.parse(responseText);
			} catch (e) {
				// is mozilla format, not json
				if (style.md5Url) {
					getURL(style.md5Url).then((md5) => {
						saveOneStyle(style, responseText, md5);
					});
				} else {
					saveOneStyle(style, responseText, null);
				}
				return;
			}
			// if it is json, continue
			if (typeof(serverJson.advanced) !== 'undefined') {
				serverJson.advanced.saved = style.advanced.saved;
			}
			if (Object.keys(style.advanced.saved).length > 0) {
				serverJson.sections = applyAdvanced(style.advanced.css, style.advanced.item, style.advanced.saved);
			}
			update(style, serverJson);
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
	return new Promise((resolve) => {
		if (typeof(less) === 'undefined') {
			resolve(content);
			return;
		}
		less.render(content, function (e, output) {
			resolve(output.css);
		});
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