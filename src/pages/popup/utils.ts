import browser from 'webextension-polyfill';
import Api from '@/share/pages/api';

export function openOption(params?: any) {
  let url = browser.runtime.getURL('options.html');
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }
  Api.openURL(url);
  window.close();
}
