import utils from './utils'
import storage from './storage'

var cachedStyles = null;
function get(options) {
	return new Promise((resolve) => {
		if (cachedStyles != null) {
			resolve(filterStyles(cachedStyles, options));
		} else {
			storage.getDatabase().then((db) => {
				const tx = db.transaction(["styles"], "readonly");
				const os = tx.objectStore("styles");
				const all = [];
				os.openCursor().onsuccess = function(event) {
					const cursor = event.target.result;
					if (cursor) {
						const s = cursor.value;
						s.id = cursor.key;
						all.push(cursor.value);
						cursor.continue();
					} else {
						cachedStyles = all;
						resolve(filterStyles(all, options));
					}
				};
			});
		}
	});
}

function getInstalledStyleForDomain(domain){
	return new Promise(function(resolve, reject){
		browser.runtime.sendMessage({method: "get", matchUrl: domain}).then(resolve);
	});
}

function invalidateCache(andNotify) {
	cachedStyles = null;
	if (andNotify) {
		browser.runtime.sendMessage({method: "invalidateCache"});
	}
}

function filterStyles(styles, options) {
	var url = "url" in options ? options.url : null;
	var id = "id" in options ? Number(options.id) : null;
	var matchUrl = "matchUrl" in options ? options.matchUrl : null;

	if (options.enabled != null) {
		styles = styles.filter(function(style) {
			return style.enabled == enabled;
		});
	}
	if (url != null) {
		styles = styles.filter(function(style) {
			return style.url == url;
		});
	}
	if (id != null) {
		styles = styles.filter(function(style) {
			return style.id == id;
		});
	}
	if (matchUrl != null) {
		// Return as a hash from style to applicable sections? Can only be used with matchUrl.
		var asHash = "asHash" in options ? options.asHash : false;
		if (asHash) {
			var h = {disableAll: prefs.get("disableAll", false)};
			styles.forEach(function(style) {
				var applicableSections = getApplicableSections(style, matchUrl);
				if (applicableSections.length > 0) {
					h[style.id] = applicableSections;
				}
			});
			return h;
		}
		styles = styles.filter(function(style) {
			var applicableSections = getApplicableSections(style, matchUrl);
			return applicableSections.length > 0;
		});
	}
	return styles;
}

function save(o) {
	delete o["method"];
	return new Promise((resolve) => {
		storage.getDatabase().then((db) => {
			var tx = db.transaction(["styles"], "readwrite");
			var os = tx.objectStore("styles");
			// Update
			if (o.id) {
				var request = os.get(Number(o.id));
				request.onsuccess = function(event) {
					var style = request.result || {};
					for (var prop in o) {
						if (prop == "id") {
							continue;
						}
						style[prop] = o[prop];
					}
					if (typeof(style.advanced) === 'undefined') {
						style.advanced = {"item": {}, "saved": {}, "css": []};
					}
					request = os.put(style);
					request.onsuccess = function(event) {
						notifyAllTabs({method: "styleUpdated", style: style});
						invalidateCache(true);
						resolve(style);
					};
				};
				return;
			}
			// Create
			// Set optional things to null if they're undefined
			["updateUrl", "md5Url", "url", "originalMd5"].filter(function(att) {
				return !(att in o);
			}).forEach(function(att) {
				o[att] = null;
			});
			if (typeof(o.advanced) === 'undefined') {
				o.advanced = {"item": {}, "saved": {}, "css": []};
			}
			// Set other optional things to empty array if they're undefined
			o.sections.forEach(function(section) {
				["urls", "urlPrefixes", "domains", "regexps", "exclude"].forEach(function(property) {
					if (!section[property]) {
						section[property] = [];
					}
				});
			});
			// Set to enabled if not set
			if (!("enabled" in o)) {
				o.enabled = true;
			}
			// Make sure it's not null - that makes indexeddb sad
			delete o["id"];
			var request = os.add(o);
			request.onsuccess = function(event) {
				invalidateCache(true);
				// Give it the ID that was generated
				o.id = event.target.result;
				notifyAllTabs({method: "styleAdded", style: o});
				resolve(o);
			};
		});
	});
}

// Install a style, check its url
function install(json) {
	json = utils.updateStyleFormat(json);
	if (json.url) {
		return new Promise((resolve) => {
			get({url: json.url}).then((response) => {
				if (response.length != 0) {
					json.id = response[0].id;
					delete json.name;
				}
				if (typeof(json.autoUpdate) === 'undefined') {
					json.autoUpdate = json.updateUrl !== null;
				}
				save(json).then(resolve);
			});
		});
	}
	// Have not URL key, install as a new style
	return save(json);
}

function enable(id, enabled) {
	return new Promise(function(resolve){
		save({id: id, enabled: enabled}).then((style) => {
			handleUpdate(style);
			notifyAllTabs({method: "styleUpdated", style: style});
			resolve();
		});
	});
}

function remove(id) {
	return new Promise(function(resolve){
		storage.getDatabase().then((db) => {
			var tx = db.transaction(["styles"], "readwrite");
			var os = tx.objectStore("styles");
			var request = os.delete(Number(id));
			request.onsuccess = function(event) {
				handleDelete(id);
				invalidateCache(true);
				notifyAllTabs({method: "styleDeleted", id: id});
				resolve();
			};
		});
	});
}

const namespacePattern = /^\s*(@namespace[^;]+;\s*)+$/;
function getApplicableSections(style, url) {
	var sections = style.sections.filter(function(section) {
		return sectionAppliesToUrl(section, url);
	});
	// ignore if it's just namespaces
	if (sections.length == 1 && namespacePattern.test(sections[0].code)) {
		return [];
	}
	return sections;
}

function sectionAppliesToUrl(section, url) {
	if (!utils.canStyle(url)) {
		return false;
	}
	if (section.exclude && section.exclude.length > 0) {
		if (section.exclude.some(function(exclude) {
			if (exclude[0] != "^") {
				exclude = "^" + exclude;
			}
			if (exclude[exclude.length - 1] != "$") {
				exclude += "$";
			}
			var re = runTryCatch(function() { return new RegExp(exclude) });
			if (re) {
				return (re).test(url);
			} else {
				console.log(section.id + "'s exclude '" + exclude + "' is not valid");
			}
		})) {
			return false;
		}
	}
	if (section.urls.length == 0 && section.domains.length == 0 && section.urlPrefixes.length == 0 && section.regexps.length == 0) {
		//console.log(section.id + " is global");
		return true;
	}
	if (section.urls.indexOf(url) != -1) {
		//console.log(section.id + " applies to " + url + " due to URL rules");
		return true;
	}
	if (section.urlPrefixes.some(function(prefix) {
		return url.indexOf(prefix) == 0;
	})) {
		//console.log(section.id + " applies to " + url + " due to URL prefix rules");
		return true;
	}
	if (section.domains.length > 0 && getDomains(url).some(function(domain) {
		return section.domains.indexOf(domain) != -1;
	})) {
		//console.log(section.id + " applies due to " + url + " due to domain rules");
		return true;
	}
	if (section.regexps.some(function(regexp) {
		// we want to match the full url, so add ^ and $ if not already present
		if (regexp[0] != "^") {
			regexp = "^" + regexp;
		}
		if (regexp[regexp.length - 1] != "$") {
			regexp += "$";
		}
		var re = runTryCatch(function() { return new RegExp(regexp) });
		if (re) {
			return (re).test(url);
		} else {
			console.log(section.id + "'s regexp '" + regexp + "' is not valid");
		}
	})) {
		//console.log(section.id + " applies to " + url + " due to regexp rules");
		return true;
	}
	//console.log(section.id + " does not apply due to " + url);
	return false;
}

export default {
	get,
	getInstalledStyleForDomain,
	invalidateCache,
	save,
	enable,
	remove,
	install
}