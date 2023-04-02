import browser from 'webextension-polyfill';
import logger from '@/share/core/logger';
import { APIs, PARSE_STYLE_FORMAT } from '@/share/core/constant';
import { prefs } from '@/share/core/prefs';
import { parseStyleFile, parseStyleJSON } from '@/share/pages/style-parser';
import { openURL } from './utils';
import { getDatabase } from './core/db';
import styles from './core/styles';

function execute(request: any, sender) {
  if (request.method === 'notifyBackground') {
    request.method = request.reason;
    delete request.reason;
  }

  switch (request.method) {
    case APIs.HEALTH_CHECK:
      return new Promise((resolve) => {
        getDatabase().then(() => {
          resolve(true);
        }).catch(() => {
          resolve(false);
        });
      });
    case APIs.OPEN_URL:
      return openURL(request);
    case APIs.GET_STYLES:
      // check if this is a main content frame style enumeration
      return new Promise((resolve) => {
        styles.get(request).then((style) => {
          if (request.matchUrl && !request.id && sender && sender.tab && sender.frameId === 0 && sender.tab.url === request.matchUrl) {
            // notify.updateIcon(sender.tab, styles);
          }
          resolve(style);
        });
      });
    case APIs.SAVE_STYLE:
      return styles.save(request);
    case APIs.PARSE_STYLE:
      if (request.format === PARSE_STYLE_FORMAT.JSON) {
        return parseStyleJSON(request.code, request.options, request.advanced);
      }
      return parseStyleFile(request.code, request.options, request.advanced);
    case APIs.INSTALL_STYLE:
      return styles.install(request);
    case APIs.UPDATE_CACHE:
      styles.invalidateCache();
      break;
    case 'getPrefs':
      if (typeof (request.name) === 'string') {
        return prefs.get(request.name);
      }
      return request.name.map((n) => prefs.get(n));
  }
  // return false;
}

function initApiHandler() {
  browser.runtime.onMessage.addListener((request, sender) => {
    logger.debug('Background Receive Message', request);
    if (request.method === 'batchExecute') {
      const queue = request.batch.map((item) => {
        const res = execute(item, sender);
        if (res) {
          return res;
        }
        return Promise.resolve();
      });
      return Promise.allSettled(queue);
    }
    return execute(request, sender);
  });
}

export default initApiHandler;
