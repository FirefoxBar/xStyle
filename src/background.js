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
			browser.tabs.sendMessage(data.tabId, {method: method, styles: styleHash}, frameIdMessageable ? {frameId: data.frameId} : undefined);
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
			openURL(request, sendResponse);
			return true;
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

browser.tabs.onUpdated.addListener(function(tabId, info, tab) {
	if (info.status == "loading" && info.url) {
		if (canStyle(info.url)) {
			webNavigationListener("styleReplaceAll", {tabId: tabId, frameId: 0, url: info.url});
		} else {
			updateIcon(tab);
		}
	}
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
		autoUpdateStyles();
		autoUpdateTimer = setInterval(autoUpdateStyles, 4 * 60 * 60 * 1000); // 4 hours
	}
	if (autoUpdateTimer !== null && !e) {
		clearInterval(autoUpdateTimer);
		autoUpdateTimer = null;
	}
}
function autoUpdateStyles() {
	var checkUpdateFullCode = function(style) {
		if (!style.updateUrl) {
			return;
		}
		getURL(style.updateUrl).then(function(responseText) {
			try {
				var serverJson = JSON.parse(responseText);
				if (!codeIsEqual(style.sections, serverJson.sections)) {
					update(style, serverJson);
				}
			} catch (e) {
				var sections = parseMozillaFormat(responseText);
				if (!codeIsEqual(style.sections, sections)) {
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
			}
		});
	};
	var checkUpdateMd5 = function(style, callback) {
		getURL(style.md5Url).then(function(responseText) {
			if (responseText.length != 32) {
				callback(false);
				return;
			}
			callback(responseText != style.originalMd5);
		});
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

function openURL(options, sendResponse) {
	delete options.method;
	getActiveTab(function(tab) {
		// re-use an active new tab page
		// Firefox may have more than 1 newtab url, so check all
		var isNewTab = false;
		if (tab.url.indexOf('about:newtab') === 0 || tab.url.indexOf('about:home') === 0) {
			isNewTab = true;
		}
		browser.tabs[isNewTab ? "update" : "create"](options).then(sendResponse);
	});
}