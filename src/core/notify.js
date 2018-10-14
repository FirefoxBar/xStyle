import browser from 'webextension-polyfill';
import merge from 'merge';
import utils from './utils';

export default {
	tabs() {
		return new Promise(resolve => {
			if (utils.IS_MOBILE) {
				browser.tabs.query({}).then(tabs => {
					tabs.forEach(tab => {
						if (utils.canAccess(tab.url)) {
							this.updateIcon(tab);
							browser.tabs.sendMessage(tab.id, request);
						}
					});
					resolve();
				});
			} else {
				// notify other tabs
				browser.windows.getAll({populate: true}).then(windows => {
					windows.forEach(win => {
						win.tabs.forEach(tab => {
							if (utils.canAccess(tab.url)) {
								this.updateIcon(tab);
								browser.tabs.sendMessage(tab.id, request);
							}
						});
					});
					resolve();
				});
			}
		});
	},
	background(request) {
		return browser.runtime.sendMessage(merge(true, request, {
			method: "notifyBackground",
			reason: request.method
		}));
	},
	updateIcon(tab, styles) {
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
	
		function stylesReceived(styles) {
			if (styles.disableAll) {
				icon = "images/128w.png";
			}
			if (IS_MOBILE) {
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
	
}