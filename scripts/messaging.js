function notifyAllTabs(request) {
	return new Promise((resolve) => {
		if (isMobile) {
			browser.tabs.query({}).then((tabs) => {
				for (let tab of tabs) {
					updateIcon(tab);
					if (canStyle(tab.url)) {
						browser.tabs.sendMessage(tab.id, request);
					}
				}
				resolve();
			});
		} else {
			browser.windows.getAll({populate: true}).then((windows) => {
				windows.forEach((win) => {
					win.tabs.forEach((tab) => {
						updateIcon(tab);
						if (canStyle(tab.url)) {
							browser.tabs.sendMessage(tab.id, request);
						}
					});
				});
				resolve();
			});
			// notify all open popups
			var reqPopup = shallowMerge({}, request, {method: "updatePopup", reason: request.method});
			browser.runtime.sendMessage(reqPopup);
		}
	});
}
function notifyBackground(request) {
	return new Promise((resolve) => {
		browser.runtime.sendMessage(shallowMerge({}, request, {method: "notifyBackground", reason: request.method}));
	});
}

function processRawStylesResponse(resp){
	if (resp.styles) {
		resp.styles = JSON.parse(resp.styles);
	} else {
		resp.styles = {};
	}
	return resp;
}

function updateIcon(tab, styles) {
	// while NTP is still loading only process the request for its main frame with a real url
	// (but when it's loaded we should process style toggle requests from popups, for example)
	var icon = "images/128.png";
	if (prefs.get('disableAll')) {
		icon = "images/128w.png";
	}
	if (!canStyle(tab.url)) {
		browser.browserAction.setIcon({
			path: { 128: icon },
			tabId: tab.id
		});
		browser.browserAction.setBadgeText({text: "", tabId: tab.id});
		return;
	}
	if (styles) {
		// check for not-yet-existing tabs e.g. omnibox instant search
		browser.tabs.get(tab.id).then(() => {
			// for 'styles' asHash:true fake the length by counting numeric ids manually
			if (styles.length === undefined) {
				styles.length = 0;
				for (var id in styles) {
					styles.length += id.match(/^\d+$/) ? 1 : 0;
				}
			}
			stylesReceived(styles);
		});
		return;
	}
	getTabRealURL(tab, (url) => {
		// if we have access to this, call directly. a page sending a message to itself doesn't seem to work right.
		if (typeof getStyles != "undefined") {
			getStyles({matchUrl: url, enabled: true}, stylesReceived);
		} else {
			browser.runtime.sendMessage({method: "getStyles", matchUrl: url, enabled: true}).then(stylesReceived);
		}
	});

	function stylesReceived(styles) {
		if (styles.disableAll) {
			icon = "images/128w.png";
		}
		if (isMobile) {
			if (prefs.get("show-badge")) {
				var t = browser.i18n.getMessage('extName') + (styles.length ? '(' + styles.length.toString() + ')' : "");
				browser.browserAction.setTitle({title: t, tabId: tab.id});
			}
		} else {
			browser.browserAction.setIcon({
				path: {
					128: icon
				},
				tabId: tab.id
			}).then(() => {
				// if the tab was just closed an error may occur,
				if (prefs.get("show-badge")) {
					var t = styles.length ? styles.length.toString() : "";
					browser.browserAction.setBadgeText({text: t, tabId: tab.id});
					browser.browserAction.setBadgeBackgroundColor({color: "#555"});
				} else {
					browser.browserAction.setBadgeText({text: "", tabId: tab.id});
				}
			});
		}
	}
}

function getDomainName(href){
	var l = document.createElement("a");
	l.href = href;
	return l.hostname;
}

function getActiveTabRealURL(callback) {
	getActiveTab((tab) => {
		getTabRealURL(tab, callback);
	});
}

function isRealUrlAddress(url) {
	return (
		url.indexOf("http") === 0 &&
			["://localhost", "chrome/newtab", "chrome://"].every((v) => {
				return url.indexOf(v) === -1;
			})
	) ? url : null;
}

function getTabRealURL(tab, callback) {
	if (tab.url != "chrome://newtab/") {
		callback(tab.url);
	} else {
		browser.webNavigation.getFrame({tabId: tab.id, frameId: 0, processId: -1}).then((frame) => {
			frame && callback(frame.url);
		});
	}
}
