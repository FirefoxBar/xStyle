// is mobile or not
const isAndroid = navigator.userAgent.indexOf('Android') > 0;
const isIOS = navigator.userAgent.indexOf('iOS') > 0;
const isMobile = (isAndroid || isIOS);

//export
const XSTYLE_DUMP_FILE_EXT = ".json";
const XSTYLE_DUMP_FILE_NAME = "xstyle-{Y}-{m}-{d}-{H}-{i}-{s}" + XSTYLE_DUMP_FILE_EXT;
const XSTYLE_DEFAULT_SAVE_NAME = "xstyle-export" + XSTYLE_DUMP_FILE_EXT;

var isFirefox = false;
var FIREFOX_VERSION = 0;
if (/Firefox\/(\d+)\.(\d+)/.test(navigator.userAgent)) {
	isFirefox = true;
	FIREFOX_VERSION = navigator.userAgent.match(/Firefox\/(\d+)\.(\d+)/);
	FIREFOX_VERSION = parseFloat(FIREFOX_VERSION[1] + '.' + FIREFOX_VERSION[2]);
}

var isChrome = false;
var CHROME_VERSION = 0;
if (/Chrome\/(\d+)\.(\d+)/.test(navigator.userAgent)) {
	isChrome = true;
	CHROME_VERSION = navigator.userAgent.match(/Chrome\/(\d+)\.(\d+)/);
	CHROME_VERSION = parseFloat(CHROME_VERSION[1] + '.' + CHROME_VERSION[2]);
}

// make querySelectorAll enumeration code readable
["forEach", "some", "indexOf", "map"].forEach(function(method) {
	if (typeof(NodeList.prototype[method]) === 'undefined') {
		NodeList.prototype[method]= Array.prototype[method];
	}
});

//date format
function DateFormat(f, d) {
	if (typeof(d) === 'undefined') {
		d = new Date();
	}
	f = f.replace(/\{Y\}/g, d.getFullYear());
	f = f.replace(/\{m\}/g, d.getMonth() + 1);
	f = f.replace(/\{d\}/g, d.getDate());
	f = f.replace(/\{H\}/g, d.getHours());
	f = f.replace(/\{i\}/g, d.getMinutes());
	f = f.replace(/\{s\}/g, d.getSeconds());
	return f;
}

//get url params
function getParams() {
	var params = {};
	var urlParts = location.href.split("?", 2);
	if (urlParts.length == 1) {
		return params;
	}
	urlParts[1].split("&").forEach(function(keyValue) {
		var splitKeyValue = keyValue.split("=", 2);
		params[decodeURIComponent(splitKeyValue[0])] = decodeURIComponent(splitKeyValue[1]);
	});
	return params;
}

// Whether the URL can be styled or not
function canStyle(url) {
	// only http, https, file, extension allowed
	if (url.indexOf("http") !== 0 && url.indexOf("file") !== 0 && url.indexOf("moz-extension") !== 0 && url.indexOf("chrome-extension") !== 0 && url.indexOf("ftp") !== 0) {
		return false;
	}
	// other extensions can't be styled
	if ((url.indexOf("moz-extension") == 0 || url.indexOf("chrome-extension") == 0) && url.indexOf(browser.extension.getURL("")) != 0) {
		return false;
	}
	return true;
}

// Get Active Tab
function getActiveTab(callback) {
	browser.tabs.query({currentWindow: true, active: true}).then(function(tabs) {
		callback(tabs[0]);
	});
}

function trimNewLines(s) {
	return s.replace(/^[\s\n]+/, "").replace(/[\s\n]+$/, "");
}

function parseMozillaFormat(css) {
	var allSection = [];
	var mozStyle = trimNewLines(css.replace("@namespace url(http://www.w3.org/1999/xhtml);", ""));
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
		section.code = trimNewLines(f.substr(1, index - 2));
		addSection(section);
		if (index < f.length) {
			addSection({
				"urls": [],
				"urlPrefixes": [],
				"domains": [],
				"regexps": [],
				"code": trimNewLines(f.substr(index))
			});
		}
	}
	return allSection;
	function addSection(section) {
		// don't add empty sections
		if (!(section.code || section.urls || section.urlPrefixes || section.domains || section.regexps)) {
			return;
		}
		allSection.push(section);
	}
}