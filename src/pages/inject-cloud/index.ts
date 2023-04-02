import notify from '@/share/core/notify';
import { APIs, EVENTs } from '@/share/core/constant';

function tryParseUrl(str: string) {
  try {
    return new URLSearchParams(str);
  } catch (e) {
    // ignore
  }
  return new URLSearchParams();
}

function main() {
  const search = tryParseUrl(window.location.search.substr(1));
  const hash = tryParseUrl(window.location.hash.substr(1));
  // check if requested by xstyle
  if (search.get('state') !== 'xstyle' && hash.get('state') !== 'xstyle') {
    return;
  }
  let type = '';
  let code = '';
  switch (window.location.hostname) {
    case 'login.microsoftonline.com':
      if (!window.location.pathname.includes('common/oauth2/nativeclient')) {
        return;
      }
      type = 'OneDrive';
      code = search.get('code');
      break;
    case 'ext.firefoxcn.net':
      code = hash.get('access_token');
      if (window.location.pathname.includes('login/callback/google.html')) {
        type = 'Google';
      } else if (window.location.pathname.includes('login/callback/dropbox.html')) {
        type = 'Dropbox';
      }
      break;
  }
  if (!type || !code) {
    return;
  }
  notify.other({
    method: APIs.ON_EVENT,
    event: EVENTs.CLOUD_LOGIN,
    type,
    code,
  });
}

main();
