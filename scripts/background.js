var frameIdMessageable, backStorage = localStorage;
var autoUpdateTimer = null;

function appId() {
	function genRand(){
		var r = "xxxxxxxx-xxxx-8xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (a) => {
			var c = 16 * Math.random() | 0;
			return ("x" == a ? c : 3 & c | 8).toString(16)
		});
		localStorage.setItem("appUniqueId", r);
	};
	return localStorage.getItem("appUniqueId") || genRand();
}

runTryCatch(() => {
	browser.tabs.sendMessage(0, {}, {frameId: 0}).then(() => {
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
	getStyles({matchUrl: data.url, enabled: true, asHash: true}).then((styleHash) => {
		if (method) {
			browser.tabs.sendMessage(data.tabId, {method: method, styles: styleHash}, frameIdMessageable ? {frameId: data.frameId} : undefined);
		}
		if (data.frameId == 0) {
			updateIcon({id: data.tabId, url: data.url}, styleHash);
		}
	});
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.method === 'notifyBackground') {
		request.method = request.reason;
	}
	switch (request.method) {
		case "getStyles":
			// check if this is a main content frame style enumeration
			getStyles(request).then((styles) => {
				if (request.matchUrl && !request.id && sender && sender.tab && sender.frameId == 0 && sender.tab.url == request.matchUrl) {
					updateIcon(sender.tab, styles);
				}
				sendResponse(styles);
			});
			return true;
		case "saveStyle":
			saveStyle(request).then(sendResponse);
			return true;
		case "installStyle":
			installStyle(request).then(sendResponse);
			return true;
		case "invalidateCache":
			if (typeof invalidateCache != "undefined") {
				invalidateCache(false);
			}
			break;
		case "healthCheck":
			getDatabase().then(() => {
				sendResponse(true);
			}).catch(() => {
				sendResponse(false);
			});
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


if (IS_MOBILE) {
	browser.browserAction.onClicked.addListener(() => {
		openURL({url: browser.extension.getURL('manage.html')});
	});
} else {
	// contextMenus API is present in ancient Chrome but it throws an exception
	// upon encountering the unsupported parameter value "browser_action", so we have to catch it.
	runTryCatch(() => {
		browser.contextMenus.create({
			id: "openManage", title: browser.i18n.getMessage("openManage"),
			type: "normal", contexts: ["browser_action"]
		}, () => { var clearError = browser.runtime.lastError });
		browser.contextMenus.create({
			id: "show-badge", title: browser.i18n.getMessage("menuShowBadge"),
			type: "checkbox", contexts: ["browser_action"], checked: prefs.get("show-badge")
		}, () => { var clearError = browser.runtime.lastError });
		browser.contextMenus.create({
			id: "disableAll", title: browser.i18n.getMessage("disableAllStyles"),
			type: "checkbox", contexts: ["browser_action"], checked: prefs.get("disableAll")
		}, () => { var clearError = browser.runtime.lastError });
	});

	browser.contextMenus.onClicked.addListener((info, tab) => {
		if (info.menuItemId === 'openManage') {
			openURL({"url": browser.extension.getURL("manage.html")});
		} else if (info.menuItemId === "disableAll") {
			disableAllStylesToggle(info.checked);
		} else {
			prefs.set(info.menuItemId, info.checked);
		}
	});
	// commands
	browser.commands.onCommand.addListener((command) => {
		switch (command) {
			case 'openManage':
				openURL({"url": browser.extension.getURL("manage.html")});
				break;
			case 'styleDisableAll':
				disableAllStylesToggle();
				break;
			default:
				break;
		}
	});
}

browser.tabs.onUpdated.addListener((tabId, info, tab) => {
	if (info.status == "loading" && info.url) {
		if (canStyle(info.url)) {
			webNavigationListener("styleReplaceAll", {tabId: tabId, frameId: 0, url: info.url});
		} else {
			updateIcon(tab);
		}
	}
});

browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
	browser.tabs.get(addedTabId).then((tab) => {
		webNavigationListener("getStyles", {tabId: addedTabId, frameId: 0, url: tab.url});
	});
});

browser.tabs.onCreated.addListener((tab) => {
	updateIcon(tab);
});

function disableAllStylesToggle(newState) {
	if (newState === undefined || newState === null) {
		newState = !prefs.get("disableAll");
	}
	prefs.set("disableAll", newState);
}

// Modify CSP
browser.webRequest.onHeadersReceived.addListener((e) => {
	if (!prefs.get("modify-csp")) {
		return {"responseHeaders": e.responseHeaders};
	}
	for (let k in e.responseHeaders) {
		if (e.responseHeaders[k].name.toLowerCase() === 'content-security-policy') {
			if (!e.responseHeaders[k].value.includes('style-src')) {
				break;
			}
			let csp = /style-src (.*?);/.test(e.responseHeaders[k].value) ? e.responseHeaders[k].value.match(/style-src (.*?);/)[1] : e.responseHeaders[k].value.match(/style-src (.*?)$/)[1];
			if (csp.includes("'unsafe-inline'")) {
				break;
			}
			e.responseHeaders[k].value = e.responseHeaders[k].value.replace('style-src ' + csp, 'style-src ' + csp + " 'unsafe-inline'");
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
	getStyles({}).then((styles) => {
		for (let style of styles) {
			if (!style.url || !style.autoUpdate) {
				continue;
			} else if (!style.md5Url || !style.originalMd5) {
				updateStyleFullCode(style);
			} else {
				checkStyleUpdateMd5(style).then((needsUpdate) => {
					if (needsUpdate) {
						updateStyleFullCode(style);
					}
				});
			}
		}
	});
}
toggleAutoUpdate(prefs.get('auto-update'));

function openURL(options, sendResponse) {
	delete options.method;
	getActiveTab((tab) => {
		// re-use an active new tab page
		// Firefox may have more than 1 newtab url, so check all
		var isNewTab = false;
		if (tab.url.indexOf('about:newtab') === 0 || tab.url.indexOf('about:home') === 0) {
			isNewTab = true;
		}
		browser.tabs[isNewTab ? "update" : "create"](options).then(sendResponse);
	});
}