import { APIs, PARSE_STYLE_FORMAT } from '@/share/core/constant';
import notify from '@/share/core/notify';
import { BasicStyle } from '@/share/core/types';
import { fetchUrl, t } from '@/share/core/utils';
import Api from '@/share/pages/api';

function getCodeUrl() {
  return getMeta('xstyle-code') || getMeta('stylish-code-chrome');
}
function getMd5Url() {
  return getMeta('xstyle-md5-url') || getMeta('stylish-md5-url');
}
function getIdUrl() {
  return getMeta('xstyle-id-url') || getMeta('stylish-id-url');
}
function getStyleName() {
  return getMeta('xstyle-name');
}

function getMeta(name: string) {
  const e = document.querySelector(`link[rel='${name}']`);
  return e ? e.getAttribute('href') : null;
}

function sendEvent(type: string, data?: any) {
  if (typeof data === 'undefined') {
    data = null;
  }
  const newEvent = new CustomEvent(type, { detail: data });
  document.dispatchEvent(newEvent);
}

async function confirmStyle(code: string, param: any) {
  const json = await Api.parseStyle(PARSE_STYLE_FORMAT.JSON, code, param);
  if (!json.name || json.name === '') {
    alert(t('fileTypeUnknown'));
    return;
  }
  if (confirm(t('styleInstall', [json.name]))) {
    installByCode(json);
  }
}

async function installByCode(json: BasicStyle) {
  await notify.background({
    ...json,
    url: json.url || getIdUrl() || location.href,
    method: APIs.INSTALL_STYLE,
  });

  sendEvent('styleInstalled');
}


async function main() {
  document.addEventListener('xstyleInstall', async () => {
    const extParam: any = {};
    if (getStyleName() !== '') {
      extParam.name = getStyleName();
    }
    if (getMd5Url() !== '') {
      extParam.md5Url = getMd5Url();
    }
    const code = await fetchUrl({
      url: getCodeUrl(),
    });
    confirmStyle(code, extParam);
  }, false);

  // For open page
  if (window.location.href.indexOf('https://ext.firefoxcn.net/xstyle/install/open.html') === 0) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      const extParam: any = {};
      if (params.get('name')) {
        extParam.name = params.get('name');
      }
      const code = await fetchUrl({
        url: params.get('code'),
      });
      confirmStyle(code, extParam);
    }
  }
}

main();
