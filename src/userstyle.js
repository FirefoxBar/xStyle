/**
 * 用于用户样式相关判断和处理
 */

// parse mozilla format, return sections
function parseMozillaFormat(css) {
	var allSection = [];
	var mozStyle = trimNewLines(css.replace(/@namespace url\((.*?)\);/g, ""));
	// split by @-moz-document
	var sections = mozStyle.split('@-moz-document ');
	for (let f of sections) {
		var section = {
			"urls": [],
			"urlPrefixes": [],
			"domains": [],
			"regexps": [],
			"code": ""
		};
		while (true) {
			f = trimNewLines(trimNewLines(f).replace(/^,/, ''));
			var m = f.match(/^(url|url-prefix|domain|regexp)\((['"]?)(.+?)\2\)/);
			if (!m) {
				break;
			}
			f = f.replace(m[0], '');
			var aType = CssToProperty[m[1]];
			var aValue = aType != "regexps" ? m[3] : m[3].replace(/\\\\/g, "\\");
			if (section[aType].indexOf(aValue) < 0) {
				section[aType].push(aValue);
			}
		}
		// split this stype
		var index = 0;
		var leftCount = 0;
		while (index < f.length) {
			// ignore comments
			if (f[index] === '/' && f[index + 1] === '*') {
				index += 2;
				while (f[index] !== '*' || f[index + 1] !== '/') {
					index++;
				}
				index += 2;
			}
			if (f[index] === '{') {
				leftCount++;
			}
			if (f[index] === '}') {
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
				addSection({
					"urls": [],
					"urlPrefixes": [],
					"domains": [],
					"regexps": [],
					"code": trimNewLines(f.substr(index))
				});
			}
		} else {
			section.code = trimNewLines(f);
		}
		addSection(section);
	}
	return allSection;
	function addSection(section) {
		// don't add empty sections
		if (!section.code || (!section.urls && !section.urlPrefixes && !section.domains && !section.regexps)) {
			return;
		}
		allSection.push(section);
	}
}

// check md5 fior update
function checkStyleUpdateMd5(style) {
	return new Promise(function(resolve) {
		if (!style.md5Url || !style.originalMd5) {
			resolve(false);
		}
		getURL(style.md5Url).then(function(responseText) {
			if (responseText.length != 32) {
				resolve(false);
			}
			resolve(responseText != style.originalMd5);
		});
	});
};

// update a style
function updateStyleFullCode(style) {
	var update = function(style, serverJson) {
		// update everything but name
		delete serverJson.name;
		serverJson.id = style.id;
		serverJson.method = "saveStyle";
		browser.runtime.sendMessage(serverJson);
	};
	if (!style.updateUrl) {
		return;
	}
	getURL(style.updateUrl).then(function(responseText) {
		try {
			var serverJson = JSON.parse(responseText);
			update(style, serverJson);
		} catch (e) {
			var sections = parseMozillaFormat(responseText);
			if (style.md5Url) {
				getURL(style.md5Url).then(function(md5) {
					update(style, {
						"name": style.name,
						"updateUrl": style.updateUrl,
						"md5Url": style.md5Url || null,
						"url": style.url || null,
						"author": style.author || null,
						"originalMd5": md5,
						"sections": parseMozillaFormat(responseText)
					});
				});
			} else {
				update(style, {
					"name": style.name,
					"updateUrl": style.updateUrl,
					"md5Url": style.md5Url || null,
					"url": style.url || null,
					"author": style.author || null,
					"originalMd5": null,
					"sections": parseMozillaFormat(responseText)
				});
			}
		}
	});
};

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
			var allEquals = properties.every(function(property) {
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