function notifyAllTabs(request) {
	return new Promise(function(resolve){
        browser.windows.getAll({populate: true}).then(function(windows) {
            windows.forEach(function(win) {
                win.tabs.forEach(function(tab) {
                    browser.tabs.sendMessage(tab.id, request);
                    updateIcon(tab);
                });
            });
            resolve();
        });
        // notify all open popups
        var reqPopup = shallowMerge({}, request, {method: "updatePopup", reason: request.method});
        browser.runtime.sendMessage(reqPopup);
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
	if (tab.url == "chrome://newtab/" && tab.status != "complete") {
		return;
	}
	if (styles) {
		// check for not-yet-existing tabs e.g. omnibox instant search
		browser.tabs.get(tab.id).then(function() {
			if (!browser.runtime.lastError) {
				// for 'styles' asHash:true fake the length by counting numeric ids manually
				if (styles.length === undefined) {
					styles.length = 0;
					for (var id in styles) {
						styles.length += id.match(/^\d+$/) ? 1 : 0;
					}
				}
				stylesReceived(styles);
			}
		});
		return;
	}
	getTabRealURL(tab, function(url) {
		// if we have access to this, call directly. a page sending a message to itself doesn't seem to work right.
		if (typeof getStyles != "undefined") {
			getStyles({matchUrl: url, enabled: true}, stylesReceived);
		} else {
			browser.runtime.sendMessage({method: "getStyles", matchUrl: url, enabled: true}).then(stylesReceived);
		}
	});

	function stylesReceived(styles) {
		var disableAll = "disableAll" in styles ? styles.disableAll : prefs.get("disableAll");
		// If no styles available for this site icon also should be disabled
		var postfix = disableAll ? "w" : "";
		browser.browserAction.setIcon({
			path: {
				128: "images/128" + postfix + ".png"
			},
			tabId: tab.id
		}, function() {
			// if the tab was just closed an error may occur,
			// e.g. 'windowPosition' pref updated in edit.js::window.onbeforeunload
			if (!browser.runtime.lastError) {
				var t = prefs.get("show-badge") && styles.length ? ("" + styles.length) : "";
				browser.browserAction.setBadgeText({text: t, tabId: tab.id});
				browser.browserAction.setBadgeBackgroundColor({color: "#000"});
			}
		});
	}
}

function getDomainName(href){
    var l = document.createElement("a");
    l.href = href;
    return l.hostname;
}

function getActiveTab(callback) {
	browser.tabs.query({currentWindow: true, active: true}).then(function(tabs) {
		callback(tabs[0]);
	});
}

function getActiveTabRealURL(callback) {
	getActiveTab(function(tab) {
		getTabRealURL(tab, callback);
	});
}

function isRealUrlAddress(url) {
    return (
        url.indexOf("http") === 0 &&
            ["://localhost", "chrome/newtab", "chrome://"].every(function(v) {
                return url.indexOf(v) === -1;
            })
    ) ? url : null;
}

function getTabRealURL(tab, callback) {
	if (tab.url != "chrome://newtab/") {
		callback(tab.url);
	} else {
		browser.webNavigation.getFrame({tabId: tab.id, frameId: 0, processId: -1}).then(function(frame) {
			frame && callback(frame.url);
		});
	}
}
