import browser from 'webextension-polyfill';
import utils from './utils';
import merge from 'merge';
import equal from 'fast-deep-equal';
import notify from './notify';

function getDatabase() {
	return new Promise((resolve, reject) => {
		const dbOpenRequest = window.indexedDB.open("xstyle", 4);
		dbOpenRequest.onsuccess = function(e) {
			resolve(e.target.result);
		};
		dbOpenRequest.onerror = function(event) {
			console.log(event);
			reject(event);
		};
		dbOpenRequest.onupgradeneeded = function(event) {
			if (event.oldVersion == 0) {
				// Installed
				event.target.result.createObjectStore("styles", {
					keyPath: 'id',
					autoIncrement: true
				});
			} else {
				const tx = event.target.transaction;
				const os = tx.objectStore(k);
				os.openCursor().onsuccess = function(e) {
					const cursor = e.target.result;
					if (cursor) {
						const s = cursor.value;
						s.id = cursor.key;
						// upgrade rule format
						os.put(utils.updateStyleFormat(s));
						cursor.continue();
					}
				};
			}
		}
	});
};

const prefs = browser.extension.getBackgroundPage().prefs || new class {
	constructor() {
		this.boundMethods = {};
		this.boundWrappers = {};
		const defaults = {
			"show-badge": true, // display text on popup menu icon
			"modify-csp": true, // modify csp
			"auto-update": false, // Auto update styles
			"disableAll": false, // boss key
			"compact-popup": false,
			"only-applies-html": false,
	
			"manage.sort": "id", //sort styles in management page
	
			"editor.initAdvanced": 20,
			"editor.options": {}, // CodeMirror.defaults.*
			"editor.lineWrapping": true, // word wrap
			"editor.smartIndent": true, // "smart" indent
			"editor.indentWithTabs": false, // smart indent with tabs
			"editor.tabSize": 4, // tab width, in spaces
			"editor.keyMap":
				navigator.appVersion.indexOf("Windows") > 0 ? "sublime" : "default",
			"editor.theme": "default", // CSS theme
			"editor.beautify": { // CSS beautifier{
				"indent_size": 1,
				"indent_char": "\t",
				"space_around_selector_separator": true,
				"selector_separator_newline": true,
				"end_with_newline": false,
				"newline_between_rules": true,
				"space_around_selector_separator": true
			},
			"editor.lintDelay": 500, // lint gutter marker update delay, ms
			"editor.lintReportDelay": 2000, // lint report update delay, ms
			"editor.fontSize": 16, // font size
			"editor.fontName": "sans-serif", // font size
			"editor.gt.port": 4001 // GhostText port
		};
		this.watchQueue = {};
		// when browser is strarting up, the setting is default
		this.isDefault = true;
		this.waitQueue = [];
	
		this.values = merge(true, defaults);

		Object.keys(defaults).forEach(key => {
			this.set(key, defaults[key], true);
		});
	
		getSync().get("settings").then(result => {
			const synced = result.settings;
			for (const key in defaults) {
				if (synced && (key in synced)) {
					this.set(key, synced[key], true);
				} else {
					const value = tryMigrating(key);
					if (value !== undefined) {
						this.set(key, value);
					}
				}
			}
			this.isDefault = false;
			this.waitQueue.forEach(resolve => resolve(this));
		});
	
		browser.storage.onChanged.addListener((changes, area) => {
			if (area == "sync" && "settings" in changes) {
				const synced = changes.settings.newValue;
				if (synced) {
					for (const key in defaults) {
						if (key in synced) {
							this.set(key, synced[key], true);
							if (this.watchQueue[key]) {
								this.watchQueue[key].forEach(cb => cb(synced[key], key));
							}
						}
					}
				} else {
					// user manually deleted our settings, we'll recreate them
					getSync().set({"settings": this.values});
				}
			}
		});
	
		function tryMigrating(key) {
			if (!(key in localStorage)) {
				return undefined;
			}
			const value = localStorage[key];
			delete localStorage[key];
			localStorage["DEPRECATED: " + key] = value;
			switch (typeof defaults[key]) {
				case "boolean":
					return value.toLowerCase() === "true";
				case "number":
					return Number(value);
				case "object":
					try {
						return JSON.parse(value);
					} catch(e) {
						console.log("Cannot migrate from localStorage %s = '%s': %o", key, value, e);
						return undefined;
					}
			}
			return value;
		}
	}
	get(key, defaultValue) {
		if (key in this.boundMethods) {
			if (key in this.boundWrappers) {
				return this.boundWrappers[key];
			} else {
				if (key in this.values) {
					this.boundWrappers[key] = this.boundMethods[key](this.values[key]);
					return this.boundWrappers[key];
				}
			}
		}
		if (key in this.values) {
			return this.values[key];
		}
		if (defaultValue !== undefined) {
			return defaultValue;
		}
		if (key in defaults) {
			return defaults[key];
		}
		console.warn('No default preference for ' + key);
	}
	getAll() {
		return merge(true, this.values);
	}
	set(key, value, noSync) {
		const oldValue = merge(true, this.values[key]);
		if (!equal(value, oldValue)) {
			this.values[key] = value;
			if (!noSync) {
				getSync().set({"settings": this.values});
			}
		}
	}
	bindAPI(apiName, apiMethod) {
		this.boundMethods[apiName] = apiMethod;
	}
	remove(key) {
		this.set(key, undefined)
	}
	watch(key, callback) {
		if (typeof(this.watchQueue[key]) === "undefined") {
			this.watchQueue[key] = [];
		}
		this.watchQueue[key].push(callback);
	}
	onReady() {
		const _this = this;
		return new Promise(resolve => {
			if (!_this.isDefault) {
				resolve(_this);
			} else {
				_this.waitQueue.push(resolve);
			}
		});
	}
}

function getSync() {
	if ("sync" in browser.storage) {
		return browser.storage.sync;
	}
	if ("local" in browser.storage) {
		return browser.storage.local;
	}
}

function getLocal() {
	return browser.storage.local;
}

export default { getSync, getDatabase, getLocal, prefs };