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