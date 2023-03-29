import browser from 'webextension-polyfill';
import emitter from '@/share/core/emitter';
import { prefs } from '@/share/core/prefs';
import { IS_ANDROID, runTryCatch } from '@/share/core/utils';
import { openURL } from './utils';

function disableAllStylesToggle(newState?: boolean) {
  if (newState === undefined || newState === null) {
    newState = !prefs.get('disableAll');
  }
  prefs.set('disableAll', newState);
}

function initMenus() {
  emitter.on(emitter.EVENT_PREFS_UPDATE, (key: string, value: any) => {
    switch (key) {
      case 'disableAll':
        browser.contextMenus.update('disableAll', {
          checked: Boolean(value),
        });
        break;
      case 'show-badge':
        browser.contextMenus.update('show-badge', {
          checked: Boolean(value),
        });
        break;
    }
  });


  if (IS_ANDROID) {
    browser.browserAction.onClicked.addListener(() => {
      openURL({ url: browser.runtime.getURL('options/options.html') });
    });
  } else {
    prefs.ready(() => {
      ['disableAll', 'show-badge'].forEach((k) => {
        browser.contextMenus.update(k, { checked: prefs.get(k) });
      });
    });

    // contextMenus API is present in ancient Chrome but it throws an exception
    // upon encountering the unsupported parameter value "browser_action", so we have to catch it.
    runTryCatch(() => {
      browser.contextMenus.create({
        id: 'openManage',
        title: browser.i18n.getMessage('openManage'),
        type: 'normal',
        contexts: ['browser_action'],
      }, () => { const _ = browser.runtime.lastError; });
      browser.contextMenus.create({
        id: 'show-badge',
        title: browser.i18n.getMessage('menuShowBadge'),
        type: 'checkbox',
        contexts: ['browser_action'],
        checked: prefs.get('show-badge'),
      }, () => { const _ = browser.runtime.lastError; });
      browser.contextMenus.create({
        id: 'disableAll',
        title: browser.i18n.getMessage('disableAllStyles'),
        type: 'checkbox',
        contexts: ['browser_action'],
        checked: prefs.get('disableAll'),
      }, () => { const _ = browser.runtime.lastError; });
    });

    browser.contextMenus.onClicked.addListener((info) => {
      switch (info.menuItemId) {
        case 'openManage':
          openURL({ url: browser.runtime.getURL('manage.html') });
          break;
        case 'disableAll':
          disableAllStylesToggle(info.checked);
          break;
        default:
          prefs.set(`${info.menuItemId}`, info.checked);
          break;
      }
    });

    // commands
    browser.commands.onCommand.addListener((command) => {
      switch (command) {
        case 'openManage':
          openURL({ url: browser.runtime.getURL('options/options.html') });
          break;
        case 'styleDisableAll':
          disableAllStylesToggle();
          break;
        default:
          break;
      }
    });


    emitter.on(emitter.EVENT_PREFS_UPDATE, (key: string, value: any) => {
      switch (key) {
        case 'disableAll':
          browser.contextMenus.update('disableAll', {
            checked: Boolean(value),
          });
          break;
        case 'show-badge':
          browser.contextMenus.update('show-badge', {
            checked: Boolean(value),
          });
          break;
      }
    });
  }
}

export default initMenus;
