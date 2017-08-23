// parse mozilla format, return sections
function parseMozillaFormat(css) {
	let allSection = [{
		"urls": [],
		"urlPrefixes": [],
		"domains": [],
		"regexps": [],
		"code": ""
	}];
	let mozStyle = trimNewLines(css.replace(/@namespace url\((.*?)\);/g, ""));
	let currentIndex = 0;
	let lastIndex = 0;
	// split by @-moz-document
	while (mozStyle.indexOf('@-moz-document ', currentIndex) >= 0) {
		currentIndex = ignoreSomeCodes(mozStyle, currentIndex);
		if (mozStyle.indexOf('@-moz-document ', currentIndex) === currentIndex) {
			parseOneSection(mozStyle.substr(lastIndex, currentIndex - lastIndex));
			lastIndex = currentIndex;
		}
		currentIndex++;
	}
	// remove global section if it is empty
	allSection[0].code = trimNewLines(allSection[0].code);
	if (allSection[0].code === '') {
		allSection.splice(0, 1);
	}
	return allSection;
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
		// ignore comments
		if (f[index] === '/' && f[index + 1] === '*') {
			index += 2;
			index = f.indexOf('*/', index);
			index ++;
		}
		return index;
	}
	function parseOneSection(f) {
		f = f.replace('@-moz-document ', '');
		let section = {
			"urls": [],
			"urlPrefixes": [],
			"domains": [],
			"regexps": [],
			"code": ""
		};
		while (true) {
			f = trimNewLines(trimNewLines(f).replace(/^,/, ''));
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
		while (true) {
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
			if (index < f.length) {
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
			"sections": applyAdvanced(rawCss, style.advanced.saved)
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
				serverJson.sections = applyAdvanced(style.advanced.css, style.advanced.saved)
			}
			update(style, serverJson);
		});
	}
}

// Apply advanced to a style
function applyAdvanced(css, item, saved) {
	let getValue = (k, v) => {
		if (typeof(item[k]) === 'undefined') {
			return null;
		}
		switch (item[k].type) {
			case 'text':
				return v;
			case 'select':
				return item[k].option[v];
			case 'radio':
				return typeof(item[k].option[v]) === 'undefined' ? v : item[k].option[v];
		}
	};
	let result = [];
	for (let section of css) {
		for (let k in saved) {
			section.code = section.code.replace(new RegExp('\\/\\*\\[\\[' + k + '\\]\\]\\*\\/', 'g'), getValue(k, saved[k]));
		}
		result.push(section);
	}
	return result;
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