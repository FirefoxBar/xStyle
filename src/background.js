var frameIdMessageable, backStorage = localStorage;
var autoUpdateTimer = null;

function appId() {
	function genRand(){
		var r = "xxxxxxxx-xxxx-8xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(a){
			var c = 16 * Math.random() | 0;
			return ("x" == a ? c : 3 & c | 8).toString(16)
		});
		localStorage.setItem("appUniqueId", r);
	};
	return localStorage.getItem("appUniqueId") || genRand();
}

runTryCatch(function() {
	browser.tabs.sendMessage(0, {}, {frameId: 0}).then(function() {
		frameIdMessageable = true;
	}, function (err) {
		var clearError = err;
	});
});

// This happens right away, sometimes so fast that the content script isn't even ready. That's
// why the content script also asks for this stuff.
browser.webNavigation.onCommitted.addListener(webNavigationListener.bind(this, "styleApply"));
// Not supported in Firefox - https://bugzilla.mozilla.org/show_bug.cgi?id=1239349
if ("onHistoryStateUpdated" in browser.webNavigation) {
	browser.webNavigation.onHistoryStateUpdated.addListener(webNavigationListener.bind(this, "styleReplaceAll"));
}

browser.webNavigation.onBeforeNavigate.addListener(webNavigationListener.bind(this, null));
function webNavigationListener(method, data) {
	// Until Chrome 41, we can't target a frame with a message
	// (https://developer.chrome.com/extensions/tabs#method-sendMessage)
	// so a style affecting a page with an iframe will affect the main page as well.
	// Skip doing this for frames in pre-41 to prevent page flicker.
	if (data.frameId != 0 && !frameIdMessageable) {
		return;
	}
	getStyles({matchUrl: data.url, enabled: true, asHash: true}, function(styleHash) {
		if (method) {
			browser.tabs.sendMessage(data.tabId, {method: method, styles: styleHash},
				frameIdMessageable ? {frameId: data.frameId} : undefined);
		}
		if (data.frameId == 0) {
			updateIcon({id: data.tabId, url: data.url}, styleHash);
		}
	});
}

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method === 'notifyBackground') {
		request.method = request.reason;
	}
	switch (request.method) {
		case "getStyles":
			var styles = getStyles(request, sendResponse);
			// check if this is a main content frame style enumeration
			if (request.matchUrl && !request.id
			&& sender && sender.tab && sender.frameId == 0
			&& sender.tab.url == request.matchUrl) {
				updateIcon(sender.tab, styles);
			}
			return true;
		case "saveStyle":
			saveStyle(request, sendResponse);
			return true;
		case "invalidateCache":
			if (typeof invalidateCache != "undefined") {
				invalidateCache(false);
			}
			break;
		case "healthCheck":
			getDatabase(function() { sendResponse(true); }, function() { sendResponse(false); });
			return true;
		case "openURL":
			openURL(request);
			break;
		case "styleDisableAll":
			browser.contextMenus.update("disableAll", {checked: request.disableAll});
			break;
		case "prefChanged":
			if (request.prefName == "show-badge") {
				browser.contextMenus.update("show-badge", {checked: request.value});
			}
			if (request.prefName == "auto-update") {
				toggleAutoUpdate(request.value);
			}
			break;
	}
	sendResponse(); // avoid error
});


if (isMobile) {
	browser.browserAction.onClicked.addListener(function() {
		openURL({url: browser.extension.getURL('manage.html')});
	});
} else {
	// contextMenus API is present in ancient Chrome but it throws an exception
	// upon encountering the unsupported parameter value "browser_action", so we have to catch it.
	runTryCatch(function() {
		browser.contextMenus.create({
			id: "openManage", title: browser.i18n.getMessage("openManage"),
			type: "normal", contexts: ["browser_action"]
		}, function() { var clearError = browser.runtime.lastError });
		browser.contextMenus.create({
			id: "show-badge", title: browser.i18n.getMessage("menuShowBadge"),
			type: "checkbox", contexts: ["browser_action"], checked: prefs.get("show-badge")
		}, function() { var clearError = browser.runtime.lastError });
		browser.contextMenus.create({
			id: "disableAll", title: browser.i18n.getMessage("disableAllStyles"),
			type: "checkbox", contexts: ["browser_action"], checked: prefs.get("disableAll")
		}, function() { var clearError = browser.runtime.lastError });
	});

	browser.contextMenus.onClicked.addListener(function(info, tab) {
		if (info.menuItemId === 'openManage') {
			openURL({"url": browser.extension.getURL("manage.html")});
		} else if (info.menuItemId === "disableAll") {
			disableAllStylesToggle(info.checked);
		} else {
			prefs.set(info.menuItemId, info.checked);
		}
	});
}

// catch direct URL hash modifications not invoked via HTML5 history API
var tabUrlHasHash = {};
browser.tabs.onUpdated.addListener(function(tabId, info, tab) {
	if (info.status == "loading" && info.url) {
		if (info.url.indexOf('#') > 0) {
			tabUrlHasHash[tabId] = true;
		} else if (tabUrlHasHash[tabId]) {
			delete tabUrlHasHash[tabId];
		} else {
			// do nothing since the tab neither had # before nor has # now
			return;
		}
		webNavigationListener("styleReplaceAll", {tabId: tabId, frameId: 0, url: info.url});
	}
});

browser.tabs.onRemoved.addListener(function(tabId, info) {
	delete tabUrlHasHash[tabId];
});

browser.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
	browser.tabs.get(addedTabId).then(function(tab) {
		webNavigationListener("getStyles", {tabId: addedTabId, frameId: 0, url: tab.url});
	});
});

browser.tabs.onCreated.addListener(function (tab) {
	updateIcon(tab);
});

function disableAllStylesToggle(newState) {
	if (newState === undefined || newState === null) {
		newState = !prefs.get("disableAll");
	}
	prefs.set("disableAll", newState);
}

// Get the DB so that any first run actions will be performed immediately when the background page loads.
getDatabase(function() {}, reportError);

// When an edit page gets attached or detached, remember its state so we can do the same to the next one to open.
var editFullUrl = browser.extension.getURL("edit.html");
browser.tabs.onAttached.addListener(function(tabId, data) {
	browser.tabs.get(tabId).then(function(tabData) {
		if (tabData.url.indexOf(editFullUrl) == 0) {
			browser.windows.get(tabData.windowId, {populate: true}).then(function(win) {
				// If there's only one tab in this window, it's been dragged to new window
				prefs.set("openEditInWindow", win.tabs.length == 1);
			});
		}
	});
});

// Modify CSP
browser.webRequest.onHeadersReceived.addListener(function(e) {
	if (!prefs.get("modify-csp")) {
		return {"responseHeaders": e.responseHeaders};
	}
	for (var k in e.responseHeaders) {
		if (e.responseHeaders[k].name.toLowerCase() === 'content-security-policy') {
			if (e.responseHeaders[k].value.indexOf('style-src') < 0) {
				break;
			}
			var csp = e.responseHeaders[k].value.match(/style-src (.*?);/)[1];
			if (csp.indexOf("'unsafe-inline'") >= 0) {
				break;
			}
			e.responseHeaders[k].value = e.responseHeaders[k].value.replace(/style-src (.*?);/, "style-src $1 'unsafe-inline';");
			break;
		}
	}
	return {"responseHeaders": e.responseHeaders};
}, {urls: ["<all_urls>"]}, ['blocking', 'responseHeaders']);

// enable/disable auto update
function toggleAutoUpdate(e) {
	if (autoUpdateTimer === null && e) {
		autoUpdateTimer = setInterval(autoUpdateStyles, 30 * 60 * 1000); // 20 mintunes
	}
	if (autoUpdateTimer !== null && !e) {
		clearInterval(autoUpdateTimer);
		autoUpdateTimer = null;
	}
}
function autoUpdateStyles() {
	var download = function(url, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function (aEvt) {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					callback(xhr.responseText)
				}
			}
		}
		if (url.length > 2000) {
			var parts = url.split("?");
			xhr.open("POST", parts[0], true);
			xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			xhr.send(parts[1]);
		} else {
			xhr.open("GET", url, true);
			xhr.send();
		}
	};
	var checkUpdateFullCode = function(style) {
		download(style.url, function(responseText) {
			try {
				var serverJson = JSON.parse(responseText);
			} catch (e) {
				return;
			}
			if (!codeIsEqual(style.sections, serverJson.sections)) {
				update(style, serverJson);
			}
		});
	};
	var checkUpdateMd5 = function(style, callback) {
		download(style.md5Url, function(responseText) {
			if (responseText.length != 32) {
				callback(false);
				return;
			}
			callback(responseText != style.originalMd5);
		});
	};
	var jsonEquals = function(a, b, property) {
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
	var codeIsEqual = function(a, b) {
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
	var update = function(style, serverJson) {
		// update everything but name
		delete serverJson.name;
		serverJson.id = style.id;
		serverJson.method = "saveStyle";
		browser.runtime.sendMessage(serverJson);
	};
	getStyles({}, function(styles) {
		for (let style of styles) {
			if (!style.url || !style.autoUpdate) {
				continue;
			} else if (!style.md5Url || !style.originalMd5) {
				checkUpdateFullCode(style);
			} else {
				checkUpdateMd5(style, function(needsUpdate) {
					if (needsUpdate) {
						checkUpdateFullCode(style);
					}
				});
			}
		}
	});
}
toggleAutoUpdate(prefs.get('auto-update'));

function openURL(options) {
	delete options.method;
	getActiveTab(function(tab) {
		// re-use an active new tab page
		// Firefox may have more than 1 newtab url, so check all
		var isNewTab = false;
		if (tab.url.indexOf('about:newtab') === 0 || tab.url.indexOf('about:home') === 0) {
			isNewTab = true;
		}
		browser.tabs[isNewTab ? "update" : "create"](options);
	});
}