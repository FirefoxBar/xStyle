import browser from 'webextension-polyfill';
import emitter from '@/share/core/emitter';
import { prefs } from '@/share/core/prefs';

// Modify CSP
function modifyCSPHeader(e: browser.WebRequest.OnHeadersReceivedDetailsType) {
  for (const k in e.responseHeaders) {
    if (e.responseHeaders[k].name.toLowerCase() === 'content-security-policy') {
      if (!e.responseHeaders[k].value.includes('style-src')) {
        break;
      }
      const csp = /style-src (.*?);/.test(e.responseHeaders[k].value) ?
        e.responseHeaders[k].value.match(/style-src (.*?);/)[1] :
        e.responseHeaders[k].value.match(/style-src (.*?)$/)[1];
      if (csp.includes("'unsafe-inline'")) {
        break;
      }
      e.responseHeaders[k].value = e.responseHeaders[k].value.replace(`style-src ${csp}`, `style-src ${csp} 'unsafe-inline'`);
      break;
    }
  }
  return {
    responseHeaders: e.responseHeaders,
  };
}

function toggleCSP(to: boolean) {
  if (!to && browser.webRequest.onHeadersReceived.hasListener(modifyCSPHeader)) {
    browser.webRequest.onHeadersReceived.removeListener(modifyCSPHeader);
  } else if (to && !browser.webRequest.onHeadersReceived.hasListener(modifyCSPHeader)) {
    browser.webRequest.onHeadersReceived.addListener(modifyCSPHeader, { urls: ['<all_urls>'] }, ['blocking', 'responseHeaders']);
  }
}

function initModifyCSP() {
  emitter.on(emitter.EVENT_PREFS_UPDATE, (key: string, value: any) => {
    if (key === 'modify-csp') {
      toggleCSP(Boolean(value));
    }
  });

  prefs.ready(() => {
    toggleCSP(Boolean(prefs.get('modify-csp')));
  });
}

export default initModifyCSP;
