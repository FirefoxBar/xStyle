import browser from 'webextension-polyfill';
import { APIs, EVENTs, propertyToCss } from '@/share/core/constant';
import notify from '@/share/core/notify';
import { prefs } from '@/share/core/prefs';
import { BasicStyle, SavedStyle, StyleFilterOption, StyleSection } from '@/share/core/types';
import { canStyle, fetchUrl, isBackground, runTryCatch } from '@/share/core/utils';
import { getDatabase } from './db';

export type FilteredStyles = SavedStyle[] | Record<string, SavedStyle>;

let cachedStyles = null;
function get(options: StyleFilterOption): Promise<FilteredStyles> {
  return new Promise((resolve) => {
    if (cachedStyles != null) {
      resolve(filterStyles(cachedStyles, options));
    } else {
      getDatabase().then((db) => {
        const tx = db.transaction(['styles'], 'readonly');
        const os = tx.objectStore('styles');
        const all = [];
        os.openCursor().onsuccess = function (event) {
          // @ts-ignore
          const cursor = event.target.result;
          if (cursor) {
            const s = cursor.value;
            s.id = cursor.key;
            all.push(cursor.value);
            cursor.continue();
          } else {
            cachedStyles = all;
            resolve(filterStyles(all, options));
          }
        };
      });
    }
  });
}

function getInstalledStyleForDomain(domain) {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage({ method: 'get', matchUrl: domain }).then(resolve);
  });
}

function invalidateCache() {
  cachedStyles = null;
  if (!isBackground()) {
    notify.background({ method: APIs.UPDATE_CACHE });
  }
}

function filterStyles(styles: SavedStyle[], options: StyleFilterOption): FilteredStyles {
  const url = 'url' in options ? options.url : null;
  const id = 'id' in options ? Number(options.id) : null;
  const matchUrl = 'matchUrl' in options ? options.matchUrl : null;

  if (options.enabled != null) {
    styles = styles.filter((style) => {
      return style.enabled === options.enabled;
    });
  }
  if (url != null) {
    styles = styles.filter((style) => {
      return style.url === url;
    });
  }
  if (id != null) {
    styles = styles.filter((style) => {
      return style.id === id;
    });
  }
  if (matchUrl != null) {
    // Return as a hash from style to applicable sections? Can only be used with matchUrl.
    const asHash = 'asHash' in options ? options.asHash : false;
    if (asHash) {
      const h = {
        disableAll: prefs.get('disableAll', false),
      };
      styles.forEach((style) => {
        const applicableSections = getApplicableSections(style, matchUrl);
        if (applicableSections.length > 0) {
          h[style.id] = applicableSections;
        }
      });
      return h;
    }
    styles = styles.filter((style) => {
      const applicableSections = getApplicableSections(style, matchUrl);
      return applicableSections.length > 0;
    });
  }
  return styles;
}

function save(o: Partial<SavedStyle>) {
  delete o['method'];
  return new Promise((resolve) => {
    getDatabase().then((db) => {
      const tx = db.transaction(['styles'], 'readwrite');
      const os = tx.objectStore('styles');
      // Update
      if (o.id) {
        if (typeof o.enabled !== 'undefined') {
          o.enabled = !!o.enabled;
        }
        const request = os.get(Number(o.id));
        request.onsuccess = function (event) {
          const style = request.result || {};
          for (const prop in o) {
            if (prop === 'id') {
              continue;
            }
            style[prop] = o[prop];
          }
          if (typeof (style.advanced) === 'undefined') {
            style.advanced = { item: {}, saved: {}, css: [] };
          }
          const putRequest = os.put(style);
          putRequest.onsuccess = () => {
            invalidateCache();
            notify.tabs({
              method: 'styleUpdated',
              style,
            });
            resolve(style);
          };
        };
        return;
      }
      // Create
      // Set optional things to null if they're undefined
      ['updateUrl', 'md5Url', 'url', 'originalMd5'].filter((att) => {
        return !(att in o);
      }).forEach((att) => {
        o[att] = null;
      });
      if (typeof (o.advanced) === 'undefined') {
        o.advanced = { item: {}, saved: {}, css: [] };
      }
      // Set other optional things to empty array if they're undefined
      o.sections.forEach((section) => {
        ['urls', 'urlPrefixes', 'domains', 'regexps', 'exclude'].forEach((property) => {
          if (!section[property]) {
            section[property] = [];
          }
        });
      });
      // Set to enabled if not set
      if (!('enabled' in o)) {
        o.enabled = true;
      }
      if (typeof (o.enabled) !== 'boolean') {
        o.enabled = !!o.enabled;
      }
      // Make sure it's not null - that makes indexeddb sad
      delete o['id'];
      const request = os.add(o);
      request.onsuccess = function (event) {
        invalidateCache();
        // Give it the ID that was generated
        // @ts-ignore
        o.id = event.target.result;
        notify.tabs({
          method: APIs.ON_EVENT,
          event: EVENTs.STYLE_ADDED,
          style: o,
        });
        resolve(o);
      };
    });
  });
}

// Install a style, check its url
function updateStyleFormat(s: Partial<BasicStyle>) {
  // version 2
  if (!s.advanced) {
    s.advanced = { item: {}, saved: {} };
  }
  // version 3
  if (!s.lastModified) {
    s.lastModified = new Date().getTime();
  }
  // version 4
  if (!s.type) {
    s.type = 'css';
  }
  if (!s.code) {
    let codeSections = null;
    if (typeof (s.advanced.css) !== 'undefined' && s.advanced.css.length) {
      codeSections = s.advanced.css;
    } else {
      codeSections = s.sections;
    }
    // Add exclude
    for (const i in s.sections) {
      if (typeof (s.sections[i].exclude) === 'undefined') {
        s.sections[i].exclude = [];
      }
    }
    s.code = codeSections.map((section) => {
      let cssMds = [];
      for (const i in propertyToCss) {
        if (section[i]) {
          const targetName = propertyToCss[i];
          cssMds = cssMds.concat(section[i].map((v) => {
            return `${targetName}("${v.replace(/\\/g, '\\\\')}")`;
          }));
        }
      }
      return cssMds.length ? `@-moz-document ${cssMds.join(', ')} {\n${section.code}\n}` : section.code;
    }).join('\n\n');
    delete s.advanced.css;
  }
  return s;
}
function install(json: any) {
  json = updateStyleFormat(json);
  if (json.url) {
    return new Promise((resolve) => {
      get({ url: json.url }).then((response) => {
        if (response.length !== 0) {
          json.id = response[0].id;
          delete json.name;
        }
        if (typeof (json.autoUpdate) === 'undefined') {
          json.autoUpdate = json.updateUrl !== null;
        }
        save(json).then(resolve);
      });
    });
  }
  // Have not URL key, install as a new style
  return save(json);
}

function remove(_id: string | number): Promise<void> {
  const id = Number(_id);
  return new Promise((resolve, reject) => {
    getDatabase().then((db) => {
      const tx = db.transaction(['styles'], 'readwrite');
      const os = tx.objectStore('styles');
      const request = os.delete(id);
      request.onsuccess = () => {
        invalidateCache();
        notify.tabs({
          method: APIs.ON_EVENT,
          event: EVENTs.STYLE_DELETED,
          id,
        });
        resolve();
      };
      request.onerror = (e) => reject(e);
    });
  });
}

const namespacePattern = /^\s*(@namespace[^;]+;\s*)+$/;
function getApplicableSections(style: SavedStyle, url: string) {
  const sections = style.sections.filter((section) => sectionAppliesToUrl(section, url));
  // ignore if it's just namespaces
  if (sections.length === 1 && namespacePattern.test(sections[0].code)) {
    return [];
  }
  return sections;
}

function sectionAppliesToUrl(section: StyleSection, url: string) {
  if (!canStyle(url)) {
    return false;
  }
  if (section.exclude && section.exclude.length > 0) {
    const isExclude = section.exclude.some((exclude) => {
      if (exclude[0] !== '^') {
        exclude = `^${exclude}`;
      }
      if (exclude[exclude.length - 1] !== '$') {
        exclude += '$';
      }
      const re = runTryCatch(() => new RegExp(exclude));
      if (re) {
        return (re).test(url);
      } else {
        console.error(`section's exclude '${exclude}' is not valid`, section);
      }
      return false;
    });
    if (isExclude) {
      return false;
    }
  }
  if (section.urls.length === 0 && section.domains.length === 0 && section.urlPrefixes.length === 0 && section.regexps.length === 0) {
    // console.log(section.id + " is global");
    return true;
  }
  if (section.urls.indexOf(url) !== -1) {
    // console.log(section.id + " applies to " + url + " due to URL rules");
    return true;
  }
  if (section.urlPrefixes.some((prefix) => url.indexOf(prefix) === 0)) {
    // console.log(section.id + " applies to " + url + " due to URL prefix rules");
    return true;
  }
  if (section.domains.length > 0 && getDomains(url).some((domain) => section.domains.includes(domain))) {
    // console.log(section.id + " applies due to " + url + " due to domain rules");
    return true;
  }
  const isMatchRegex = section.regexps.some((regexp) => {
    // we want to match the full url, so add ^ and $ if not already present
    if (regexp[0] !== '^') {
      regexp = `^${regexp}`;
    }
    if (regexp[regexp.length - 1] !== '$') {
      regexp += '$';
    }
    const re = runTryCatch(() => new RegExp(regexp));
    if (re) {
      return (re).test(url);
    } else {
      console.error(`section's regexp '${regexp}' is not valid`, section);
    }
    return false;
  });
  if (isMatchRegex) {
    // console.log(section.id + " applies to " + url + " due to regexp rules");
    return true;
  }
  // console.log(section.id + " does not apply due to " + url);
  return false;
}


// update a style
async function remoteUpdate(style: SavedStyle) {
  const update = (serverJson: any) => {
    // update everything but name
    delete serverJson.name;
    serverJson.id = style.id;
    save(serverJson);
  };

  if (!style.updateUrl) {
    return;
  }

  const { updateUrl } = style;
  // For uso
  if (updateUrl.includes('userstyles.org') && Object.keys(style.advanced.saved).length > 0) {
    const style_id = style.md5Url.match(/\/(\d+)\.md5/)[1];
    const responseText = await fetchUrl({
      url: `https://userstyles.org/api/v1/styles/${style_id}`,
    });

    const serverJson = JSON.parse(responseText);
    const rawCss = serverJson.css;
    const md5 = await fetchUrl({
      url: style.md5Url,
    });

    // TODO
    // parseStyleFile(rawCss, {
    //   "name": style.name,
    //   "md5Url": style.md5Url || null,
    //   "url": style.url || null,
    //   "author": style.author || null,
    //   "originalMd5": md5,
    //   "updateUrl": updateUrl
    // }).then((toSave) => {
    //   update(style, toSave);
    // });
    return;
  }

  // not uso
  const responseText = await fetchUrl({
    url: updateUrl,
  });

  // TODO
  // parseStyleFile(responseText, {
  //     "name": style.name,
  //     "advanced": {
  //       "saved": style.advanced.saved
  //     }
  //   }))
  //   .then((toSave) => {
  //     if (!toSave.updateUrl) {
  //       toSave.updateUrl = updateUrl;
  //     }
  //     if (style.md5Url) {
  //       getURL(style.md5Url).then((md5) => {
  //         toSave.originalMd5 = md5;
  //         update(style, toSave);
  //       });
  //     } else {
  //       update(style, toSave);
  //     }
  //   });
  // }
}

const styles = {
  get,
  getInstalledStyleForDomain,
  invalidateCache,
  save,
  remove,
  install,
  remoteUpdate,
};

export default styles;
