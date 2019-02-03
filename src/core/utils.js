import browser from 'webextension-polyfill';
import dateFormat from 'dateformat';

const IS_ANDROID = navigator.userAgent.includes('Android');
const IS_CHROME = /Chrome\/(\d+)\.(\d+)/.test(navigator.userAgent);
const CHROME_VERSION = IS_CHROME ? (() => {
	const a = navigator.userAgent.match(/Chrome\/(\d+)\.(\d+)/);
	return parseFloat(a[1] + '.' + a[2]);
})() : null;
const IS_FIREFOX = !IS_CHROME;
const FIREFOX_VERSION = IS_FIREFOX ? (() => {
	const a = navigator.userAgent.match(/Firefox\/(\d+)\.(\d+)/);
	return parseFloat(a[1] + '.' + a[2]);
})() : null;

export default {
	IS_ANDROID: IS_ANDROID,
	IS_MOBILE: IS_ANDROID,
	IS_FIREFOX: IS_FIREFOX,
	IS_CHROME: IS_CHROME,
	CHROME_VERSION: CHROME_VERSION,
	FIREFOX_VERSION: FIREFOX_VERSION,
	DUMP_FILE_EXT: '.json',
	TABLE_NAMES: ['request', 'sendHeader', 'receiveHeader'],
	// direct & reverse mapping of @-moz-document keywords and internal property names
	PROPERTY_TO_CSS: {"urls": "url", "urlPrefixes": "url-prefix", "domains": "domain", "regexps": "regexp", "exclude": "exclude"},
	CSS_TO_PROPERTY: {"url": "urls", "url-prefix": "urlPrefixes", "domain": "domains", "regexp": "regexps", "exclude": "exclude"},
	getExportName(additional) {
		return 'HE_' + dateFormat(new Date(), 'isoUtcDateTime').replace(/\:/g, '-') + (additional ? "_" + additional : "") + '.json';
	},
	// Get Active Tab
	getActiveTab() {
		return new Promise(resolve => {
			browser.tabs.query({currentWindow: true, active: true})
			.then(tabs => tabs[0])
			.then(resolve)
		});
	},
	getActiveTabRealURL() {
		return new Promise(resolve => {
			this.getActiveTab
			.then(tab => getTabRealURL(tab))
			.then(resolve)
		})
	},
	getTabRealURL(tab) {
		return new Promise(resolve => {
			if (tab.url != "chrome://newtab/") {
				resolve(tab.url);
			} else {
				browser.webNavigation.getFrame({tabId: tab.id, frameId: 0, processId: -1})
				.then(frame => {
					resolve(frame ? frame.url : "");
				});
			}
		})
	},
	trimNewLines(s) {
		return s.replace(/^[\s\n]+/, "").replace(/[\s\n]+$/, "");
	},
	getURL(url, isPost) {
		return new Promise((resolve, fail) => {
			const xhr = new XMLHttpRequest();
			xhr.onreadystatechange = () => {
				if (xhr.readyState == 4) {
					if (xhr.status >= 400) {
						fail(xhr.status);
					} else {
						resolve(xhr.responseText);
					}
				}
			};
			if (url.length > 2000 || isPost) {
				const parts = url.split("?");
				xhr.open("POST", parts[0], true);
				xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
				xhr.send(parts[1]);
			} else {
				xhr.open("GET", url, true);
				xhr.send();
			}
		})
	},
	canAccess(url) {
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
	},
	t(key, params) {
		const s = browser.i18n.getMessage(key, params)
		return s || key;
	},
	updateStyleFormat(s) {
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
			for (const e of s.sections) {
				if (typeof(e.exclude) === 'undefined') {
					e.exclude = [];
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
}
