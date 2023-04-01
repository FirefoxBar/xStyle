import browser from 'webextension-polyfill';
import { APIs } from '@/share/core/constant';
import { prefs } from '@/share/core/prefs';
import { canStyle, IS_ANDROID, runTryCatch } from '@/share/core/utils';
import { FilteredStyles } from '@/share/core/types';
import styles from './core/styles';

interface MinimalTab {
  id: number;
  url: string;
}
function updateIcon(tab: MinimalTab, gotStyles?: FilteredStyles) {
  const stylesReceived = async (recvStyles: FilteredStyles) => {
    if (IS_ANDROID) {
      if (prefs.get('show-badge')) {
        const t = browser.i18n.getMessage('extName') + (recvStyles.length ? `(${recvStyles.length.toString()})` : '');
        return browser.browserAction.setTitle({ title: t, tabId: tab.id });
      }
      return;
    }

    let icon = 'images/128.png';
    if (!Array.isArray(recvStyles)) {
      if (recvStyles.disableAll) {
        icon = 'images/128w.png';
      }
    }
    browser.browserAction.setIcon({
      path: {
        128: icon,
      },
      tabId: tab.id,
    });
    // if the tab was just closed an error may occur,
    if (prefs.get('show-badge')) {
      const t = recvStyles.length ? recvStyles.length.toString() : '';
      browser.browserAction.setBadgeText({ text: t, tabId: tab.id });
      browser.browserAction.setBadgeBackgroundColor({ color: '#555' });
    } else {
      browser.browserAction.setBadgeText({ text: '', tabId: tab.id });
    }
  };

  // while NTP is still loading only process the request for its main frame with a real url
  // (but when it's loaded we should process style toggle requests from popups, for example)
  let icon = 'images/128.png';
  if (prefs.get('disableAll')) {
    icon = 'images/128w.png';
  }
  if (!canStyle(tab.url)) {
    browser.browserAction.setIcon({
      path: { 128: icon },
      tabId: tab.id,
    });
    browser.browserAction.setBadgeText({ text: '', tabId: tab.id });
    return;
  }
  if (gotStyles) {
    // check for not-yet-existing tabs e.g. omnibox instant search
    browser.tabs.get(tab.id).then(() => {
      // for 'styles' asHash:true fake the length by counting numeric ids manually
      if (gotStyles.length === undefined) {
        gotStyles.length = 0;
        const ids = Object.keys(gotStyles);
        for (const id of ids) {
          gotStyles.length += id.match(/^\d+$/) ? 1 : 0;
        }
      }
      stylesReceived(gotStyles);
    });
  }
}

function initWebNavigation() {
  let frameIdMessageable = false;
  runTryCatch(() => {
    browser.tabs.sendMessage(0, {}, { frameId: 0 }).then(() => {
      frameIdMessageable = true;
    });
  });

  async function webNavigationListener(method: APIs, data: { tabId: number; frameId: number; url: string }) {
    // Until Chrome 41, we can't target a frame with a message
    // (https://developer.chrome.com/extensions/tabs#method-sendMessage)
    // so a style affecting a page with an iframe will affect the main page as well.
    // Skip doing this for frames in pre-41 to prevent page flicker.
    if (data.frameId !== 0 && !frameIdMessageable) {
      return;
    }
    const styleHash = await styles.get({ matchUrl: data.url, enabled: true, asHash: true });
    if (method) {
      browser.tabs.sendMessage(data.tabId, {
        method,
        styles: styleHash,
      }, frameIdMessageable ? { frameId: data.frameId } : undefined);
    }
    if (data.frameId === 0) {
      updateIcon({ id: data.tabId, url: data.url }, styleHash);
    }
  }
  // This happens right away, sometimes so fast that the content script isn't even ready. That's
  // why the content script also asks for this stuff.
  browser.webNavigation.onCommitted.addListener((detail) => webNavigationListener(APIs.STYLE_APPLY, detail));
  // Not supported in Firefox - https://bugzilla.mozilla.org/show_bug.cgi?id=1239349
  if ('onHistoryStateUpdated' in browser.webNavigation) {
    browser.webNavigation.onHistoryStateUpdated.addListener((detail) => webNavigationListener(APIs.STYLE_REPLACE_ALL, detail));
  }
  browser.webNavigation.onBeforeNavigate.addListener(webNavigationListener.bind(null, null));
  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status === 'loading' && info.url) {
      if (canStyle(info.url)) {
        webNavigationListener(APIs.STYLE_REPLACE_ALL, { tabId, frameId: 0, url: info.url });
      } else {
        if (!tab.id) {
          tab.id = tabId;
        }
        updateIcon(tab as MinimalTab);
      }
    }
  });
  browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    browser.tabs.get(addedTabId).then((tab) => {
      webNavigationListener(APIs.GET_STYLES, { tabId: addedTabId, frameId: 0, url: tab.url });
    });
  });
  browser.tabs.onCreated.addListener((tab) => {
    updateIcon(tab as MinimalTab);
  });
}

export default initWebNavigation;
