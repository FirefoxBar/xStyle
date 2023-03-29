import emitter from '@/share/core/emitter';
import { prefs } from '@/share/core/prefs';
import { SavedStyle } from '@/share/core/types';
import { fetchUrl } from '@/share/core/utils';
import styles from './core/styles';

let autoUpdateTimer: ReturnType<typeof setInterval> | null = null;

async function checkStyleUpdateMd5(style: SavedStyle) {
  if (!style.md5Url || !style.originalMd5) {
    return false;
  }
  const responseText = await fetchUrl({
    url: style.md5Url,
  });
  if (responseText.length !== 32) {
    return false;
  }

  return responseText !== style.originalMd5;
}

async function autoUpdateStyles() {
  const gotStyles = await styles.get({});
  const styleArr = Array.isArray(gotStyles) ? gotStyles : Object.values(gotStyles);
  for (const style of styleArr) {
    if (!style.url || !style.autoUpdate) {
      continue;
    }
    // no md5, force update
    if (!style.md5Url || !style.originalMd5) {
      styles.remoteUpdate(style);
      continue;
    }
    // check md5, then update
    const needsUpdate = await checkStyleUpdateMd5(style);
    if (needsUpdate) {
      styles.remoteUpdate(style);
    }
  }
}

// enable/disable auto update
function toggleAutoUpdater(e: boolean) {
  if (autoUpdateTimer === null && e) {
    autoUpdateStyles();
    autoUpdateTimer = setInterval(autoUpdateStyles, 4 * 60 * 60 * 1000); // 4 hours
  }
  if (autoUpdateTimer !== null && !e) {
    clearInterval(autoUpdateTimer);
    autoUpdateTimer = null;
  }
}


function initAutoUpdater() {
  emitter.on(emitter.EVENT_PREFS_UPDATE, (key: string, value: any) => {
    if (key === 'auto-update') {
      toggleAutoUpdater(Boolean(value));
    }
  });

  prefs.ready(() => {
    toggleAutoUpdater(Boolean(prefs.get('auto-update')));
  });
}

export default initAutoUpdater;
