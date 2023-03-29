import browser from 'webextension-polyfill';

function initUSOHandler() {
  browser.webRequest.onBeforeSendHeaders.addListener((e) => {
    if (!e.requestHeaders) {
      return;
    }
    for (const i in e.requestHeaders) {
      if (e.requestHeaders[i].name.toLowerCase() === 'referer') {
        if (e.requestHeaders[i].value.includes('userstyles.org')) {
          return;
        } else {
          e.requestHeaders[i].value = 'https://userstyles.org/';
          return { requestHeaders: e.requestHeaders };
        }
      }
    }
    e.requestHeaders.push({
      name: 'Referer',
      value: 'https://userstyles.org/',
    });
    return {
      requestHeaders: e.requestHeaders,
    };
  }, { urls: ['*://userstyles.org/*'] }, ['blocking', 'requestHeaders']);
}

export default initUSOHandler;
