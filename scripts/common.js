// is mobile or not
const IS_ANDROID = navigator.userAgent.includes('Android');
//const IS_IOS = navigator.userAgent.includes('iOS');
//const IS_MOBILE = (IS_ANDROID || IS_IOS);
const IS_MOBILE = IS_ANDROID;

//export
const XSTYLE_DUMP_FILE_EXT = ".json";
const XSTYLE_DUMP_FILE_NAME = "xstyle-{Y}-{m}-{d}_{H}.{i}.{s}" + XSTYLE_DUMP_FILE_EXT;
const XSTYLE_DEFAULT_SAVE_NAME = "xstyle-export" + XSTYLE_DUMP_FILE_EXT;

// direct & reverse mapping of @-moz-document keywords and internal property names
const propertyToCss = {urls: "url", urlPrefixes: "url-prefix", domains: "domain", regexps: "regexp"};
const CssToProperty = {"url": "urls", "url-prefix": "urlPrefixes", "domain": "domains", "regexp": "regexps"};

const CleanCSSOptions = {
	"compatibility": "",
	"format": false,
	"inline": ["local"],
	"rebase": false,
	"level": {
		"0": true,
		"1": {
			"cleanupCharsets": true,
			"normalizeUrls": true,
			"optimizeBackground": true,
			"optimizeBorderRadius": true,
			"optimizeFilter": true,
			"optimizeFontWeight": true,
			"optimizeOutline": true,
			"removeEmpty": true,
			"removeNegativePaddings": true,
			"removeQuotes": true,
			"removeWhitespace": true,
			"replaceMultipleZeros": true,
			"replaceTimeUnits": true,
			"replaceZeroUnits": true,
			"roundingPrecision": "",
			"selectorsSortingMethod": "standard",
			"specialComments": "all",
			"tidyAtRules": true,
			"tidyBlockScopes": true,
			"tidySelectors": true
		},
		"2": {
			"mergeAdjacentRules": true,
			"mergeIntoShorthands": true,
			"mergeMedia": true,
			"mergeNonAdjacentRules": false,
			"mergeSemantically": false,
			"overrideProperties": true,
			"reduceNonAdjacentRules": true,
			"removeDuplicateFontRules": true,
			"removeDuplicateMediaBlocks": true,
			"removeDuplicateRules": true,
			"removeEmpty": true,
			"removeUnusedAtRules": false,
			"restructureRules": false,
			"skipProperties": ""
		}
	},
	"sourceMap": false
};


let IS_FIREFOX = false;
let IS_CHROME = false;
let FIREFOX_VERSION = 0;
let CHROME_VERSION = 0;
if (/Firefox\/(\d+)\.(\d+)/.test(navigator.userAgent)) {
	IS_FIREFOX = true;
	FIREFOX_VERSION = (() => {
		let a = navigator.userAgent.match(/Firefox\/(\d+)\.(\d+)/);
		return parseFloat(a[1] + '.' + a[2]);
	})();
} else if (/Chrome\/(\d+)\.(\d+)/.test(navigator.userAgent)) {
	IS_CHROME = true;
	CHROME_VERSION = (() => {
		let a = navigator.userAgent.match(/Chrome\/(\d+)\.(\d+)/);
		return parseFloat(a[1] + '.' + a[2]);
	})();
}

// make querySelectorAll enumeration code readable
["forEach", "some", "indexOf", "map"].forEach((method) => {
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
	urlParts[1].split("&").forEach((keyValue) => {
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
	if ((url.indexOf("moz-extension") === 0 || url.indexOf("chrome-extension") === 0) && url.indexOf(browser.extension.getURL("")) !== 0) {
		return false;
	}
	if (IS_CHROME && url.indexOf('https://chrome.google.com/webstore') === 0) {
		return false;
	}
	return true;
}

// Get Active Tab
function getActiveTab(callback) {
	browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
		callback(tabs[0]);
	});
}

function trimNewLines(s) {
	return s.replace(/^[\s\n]+/, "").replace(/[\s\n]+$/, "");
}

function getURL(url, isPost) {
	return new Promise((resolve, fail) => {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = () => {
			if (xhr.readyState == 4) {
				if (xhr.status >= 400) {
					fail();
				} else {
					resolve(xhr.responseText);
				}
			}
		};
		if (url.length > 2000 || isPost) {
			var parts = url.split("?");
			xhr.open("POST", parts[0], true);
			xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			xhr.send(parts[1]);
		} else {
			xhr.open("GET", url, true);
			xhr.send();
		}
	});
}
