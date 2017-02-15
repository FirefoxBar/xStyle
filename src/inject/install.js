var id_url = getMeta("xstyle-id-url") || getMeta("stylish-id-url");
var code_url = getMeta("xstyle-code") || getMeta("stylish-code-chrome");
var md5_url = getMeta("xstyle-md5-url") || getMeta("stylish-md5-url");
browser.runtime.sendMessage({method: "getStyles", url: id_url || location.href}).then(function(response) {
	if (response.length == 0) {
		sendEvent("styleCanBeInstalled");
	} else {
		var installedStyle = response[0];
		// maybe an update is needed
		// use the md5 if available
		if ((window.xstyle_md5 || md5_url) && installedStyle.md5Url && installedStyle.originalMd5) {
			getResource(window.xstyle_md5 || md5_url, function(md5) {
				if (md5 == installedStyle.originalMd5) {
					sendEvent("styleAlreadyInstalled", {updateUrl: installedStyle.updateUrl});
				} else {
					sendEvent("styleCanBeUpdated", {updateUrl: installedStyle.updateUrl});
				}
			});
		} else {
			getResource(window.xstyle_code || code_url, function(code) {
				// this would indicate a failure (a style with settings?).
				if (code == null) {
					sendEvent("styleCanBeUpdated", {updateUrl: installedStyle.updateUrl});
				}
				var json = JSON.parse(code);
				if (json.sections.length == installedStyle.sections.length) {
					if (json.sections.every(function(section) {
						return installedStyle.sections.some(function(installedSection) {
							return sectionsAreEqual(section, installedSection);
						});
					})) {
						// everything's the same
						sendEvent("styleAlreadyInstalled", {updateUrl: installedStyle.updateUrl});
						return;
					};
				}
				sendEvent("styleCanBeUpdated", {updateUrl: installedStyle.updateUrl});
			});
		}
	}
});

function sectionsAreEqual(a, b) {
	if (a.code != b.code) {
		return false;
	}
	return ["urls", "urlPrefixes", "domains", "regexps"].every(function(attribute) {
		return arraysAreEqual(a[attribute], b[attribute]);
	});
}

function arraysAreEqual(a, b) {
	// treat empty array and undefined as equivalent
	if (typeof a == "undefined")
		return (typeof b == "undefined") || (b.length == 0);
	if (typeof b == "undefined")
		return (typeof a == "undefined") || (a.length == 0);
	if (a.length != b.length) {
		return false;
	}
	return a.every(function(entry) {
		return b.indexOf(entry) != -1;
	});
}

function sendEvent(type, data) {
	if (typeof data == "undefined") {
		data = null;
	}
	var newEvent = new CustomEvent(type, {detail: data});
	document.dispatchEvent(newEvent);
}

function styleInstall () {
	var styleName = window.xstyle_name || getMeta('xstyle-name');
	if (!styleName && window.location.href.indexOf('userstyles.org/styles') >= 0) {
		styleName = document.title.match(/(.*?)-/)[1].trim();
	}
	if (confirm(browser.i18n.getMessage('styleInstall', [styleName]))) {
		getResource(window.xstyle_code || code_url, function(code) {
			// check for old style json
			var json = JSON.parse(code);
			json.method = "saveStyle";
			browser.runtime.sendMessage(json).then(function(response) {
				sendEvent("styleInstalled");
			});
		});
	}
}
document.addEventListener("stylishInstall", styleInstall, false);
document.addEventListener("xstyleInstall", styleInstall, false);
// For a special website
if (window.location.href.indexOf('https://ext.firefoxcn.net/xstyle/install/open') === 0) {
	//Bind 
}

function styleUpdate() {
	browser.runtime.sendMessage({method: "getStyles", url: id_url || location.href}).then(function(response) {
		var style = response[0];
		if (confirm(browser.i18n.getMessage('styleUpdate', [style.name]))) {
			getResource(window.xstyle_code || code_url, function(code) {
				var json = JSON.parse(code);
				json.method = "saveStyle";
				json.id = style.id;
				browser.runtime.sendMessage(json).then(function() {
					sendEvent("styleInstalled");
				});
			});
		}	
	});
}
document.addEventListener("stylishUpdate", styleUpdate, false);
document.addEventListener("xstyleUpdate", styleUpdate, false);


function getMeta(name) {
	var e = document.querySelector("link[rel='" + name + "']");
	return e ? e.getAttribute("href") : null;
}

function getResource(url, callback) {
	if (url.indexOf("#") == 0) {
		if (callback) {
			callback(document.getElementById(url.substring(1)).innerText);
		}
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && callback) {
			if (xhr.status >= 400) {
				callback(null);
			} else {
		    callback(xhr.responseText);
			}
		}
	};
	if (url.length > 2000) {
		var parts = url.split("?");
		xhr.open("POST", parts[0], true);
		xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
		xhr.send(parts[1]);
	} else {
		xhr.open("GET", url, true);
		xhr.send();
	}
}
